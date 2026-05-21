from fastapi import FastAPI, UploadFile, File, HTTPException, Request, Depends, Header, BackgroundTasks, Query
from typing import Optional, List, Dict, Any
import pandas as pd
import json
from datetime import datetime, timedelta
import io
import re
from db import get_connection
import time

from fastapi.responses import StreamingResponse


from dotenv import load_dotenv
import os
from evds import evdsAPI
import smtplib
from email.mime.text import MIMEText

from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from jose import JWTError, jwt
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from routers import ai



CACHE = {}

def get_cache(key, ttl_seconds=600):
    item = CACHE.get(key)

    if not item:
        return None

    value, created_at = item

    if time.time() - created_at > ttl_seconds:
        CACHE.pop(key, None)
        return None

    return value


def set_cache(key, value):
    CACHE[key] = (value, time.time())


load_dotenv()
EVDS_API_KEY = os.getenv("EVDS_API_KEY")

app = FastAPI()

@app.middleware("http")
async def log_request_time(request: Request, call_next):
    start_time = time.time()

    response = await call_next(request)

    duration = round(time.time() - start_time, 3)

    print(
        f"[PERFORMANS] {request.method} {request.url.path} "
        f"{duration} saniye"
    )

    return response

app.include_router(ai.router)


class RolePermissionUpdate(BaseModel):
    permissions: List[str]


# =========================================================
# CORS / CANLI ORTAM AYARLARI
# =========================================================
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-this-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 8
RESET_TOKEN_EXPIRE_MINUTES = 30
security = HTTPBearer()
MAIL_USERNAME = os.getenv("MAIL_USERNAME")
MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")
MAIL_FROM = os.getenv("MAIL_FROM")
MAIL_SERVER = os.getenv("MAIL_SERVER", "smtp.gmail.com")
MAIL_PORT = int(os.getenv("MAIL_PORT", "587"))


from fastapi.middleware.cors import CORSMiddleware


origins = [
    "http://localhost:3000",
    "https://crm-project-yhe99ajkg-ganimees-projects.vercel.app",
    "https://crm-project-rust.vercel.app",
    "https://crm-project.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
   
# =========================================================
# AUTH / JWT / YETKİ SİSTEMİ
# =========================================================
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class LoginRequest(BaseModel):
    eposta: str
    sifre: str



class CreateUserRequest(BaseModel):
    ad: str
    soyad: str
    eposta: str
    sifre: str
    rol_id: int

class ForgotPasswordRequest(BaseModel):
    eposta: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    yeni_sifre: str


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict) -> str:
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = data.copy()
    payload.update({"exp": expire})
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def create_reset_token(eposta: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES)

    payload = {
        "sub": eposta,
        "type": "password_reset",
        "exp": expire
    }

    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def verify_reset_token(token: str) -> str:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        if payload.get("type") != "password_reset":
            raise HTTPException(status_code=400, detail="Geçersiz şifre sıfırlama bağlantısı")

        eposta = payload.get("sub")

        if not eposta:
            raise HTTPException(status_code=400, detail="Geçersiz şifre sıfırlama bağlantısı")

        return eposta

    except JWTError:
        raise HTTPException(
            status_code=400,
            detail="Şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş"
        )

def send_reset_email(to_email: str, reset_link: str):

    print("MAIL_SERVER:", MAIL_SERVER)
    print("MAIL_PORT:", MAIL_PORT)
    print("MAIL_USERNAME:", MAIL_USERNAME)

    if not MAIL_USERNAME or not MAIL_PASSWORD or not MAIL_FROM:
        raise Exception(".env mail ayarları eksik")
    if not MAIL_USERNAME or not MAIL_PASSWORD or not MAIL_FROM:
        raise Exception(".env mail ayarları eksik")

    subject = "Sporthink CRM Şifre Sıfırlama"

    html = f"""
    <html>
      <body style="font-family:Arial,sans-serif;background:#f4f4f5;padding:30px;">
        <div style="max-width:560px;margin:auto;background:white;border-radius:20px;padding:32px;border:1px solid #eee;">
          <h2 style="color:#dc2626;">Şifre Sıfırlama</h2>
          <p>Sporthink CRM hesabınız için şifre sıfırlama talebi aldık.</p>
          <p>Yeni şifrenizi belirlemek için aşağıdaki butona tıklayın.</p>

          <a href="{reset_link}"
             style="display:inline-block;margin-top:20px;background:#dc2626;color:white;
                    padding:14px 24px;border-radius:12px;text-decoration:none;font-weight:bold;">
            Şifremi Güncelle
          </a>

          <p style="margin-top:26px;color:#777;font-size:13px;">
            Bu bağlantı 30 dakika geçerlidir.
          </p>
        </div>
      </body>
    </html>
    """

    message = MIMEText(html, "html", "utf-8")
    message["Subject"] = subject
    message["From"] = MAIL_FROM
    message["To"] = to_email

    with smtplib.SMTP(MAIL_SERVER, MAIL_PORT, timeout=20) as server:
        server.starttls()
        server.login(MAIL_USERNAME, MAIL_PASSWORD)
        server.sendmail(MAIL_FROM, to_email, message.as_string())


def log_login(conn, kullanici_id, eposta, basarili_mi, hata_mesaji, request: Request):
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO login_loglari
        (kullanici_id, eposta, basarili_mi, hata_mesaji, ip_adresi, user_agent)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (
        kullanici_id,
        eposta,
        basarili_mi,
        hata_mesaji,
        request.client.host if request.client else None,
        request.headers.get("user-agent")
    ))
    cursor.close()


def get_user_permissions(kullanici_id: int):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT 
            k.kullanici_id,
            k.ad,
            k.soyad,
            k.eposta,
            r.rol_adi,
            y.yetki_kodu
        FROM kullanicilar k
        JOIN kullanici_rolleri kr ON k.kullanici_id = kr.kullanici_id
        JOIN roller r ON kr.rol_id = r.rol_id
        JOIN rol_yetkileri ry ON r.rol_id = ry.rol_id
        JOIN yetkiler y ON ry.yetki_id = y.yetki_id
        WHERE k.kullanici_id = %s
          AND k.aktif_mi = 1
          AND r.aktif_mi = 1
          AND y.aktif_mi = 1
    """, (kullanici_id,))

    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    if not rows:
        return None

    return {
       "kullanici_id": rows[0]["kullanici_id"],
        "ad_soyad": f"{rows[0]['ad']} {rows[0]['soyad']}",
        "eposta": rows[0]["eposta"],
        "rol": rows[0]["rol_adi"],
        "permissions": sorted(list(set(row["yetki_kodu"] for row in rows)))
}


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        kullanici_id = int(payload.get("sub"))

        user = get_user_permissions(kullanici_id)

        if not user:
            raise HTTPException(status_code=401, detail="Kullanıcı bulunamadı")

        return user

    except JWTError:
        raise HTTPException(status_code=401, detail="Geçersiz token")

    except Exception as e:
        print("TOKEN / USER PERMISSION HATASI:", e)
        raise HTTPException(status_code=401, detail=f"Token doğrulanamadı: {str(e)}")


def require_permission(permission_code: str):
    def permission_checker(current_user: dict = Depends(get_current_user)):

      
        if current_user.get("rol") == "super_admin":
            return current_user

        if permission_code not in current_user["permissions"]:
            raise HTTPException(
                status_code=403,
                detail=f"Bu işlem için yetkiniz yok: {permission_code}"
            )

        return current_user

    return permission_checker


@app.post("/auth/login")
def login(data: LoginRequest, request: Request):
    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT kullanici_id, ad, soyad, eposta, sifre_hash, aktif_mi
            FROM kullanicilar
            WHERE eposta = %s
            LIMIT 1
        """, (data.eposta,))

        user = cursor.fetchone()

        if not user:
            log_login(conn, None, data.eposta, 0, "Kullanıcı bulunamadı", request)
            conn.commit()
            raise HTTPException(status_code=401, detail="E-posta veya şifre hatalı")

        if user["aktif_mi"] != 1:
            log_login(conn, user["kullanici_id"], user["eposta"], 0, "Kullanıcı pasif", request)
            conn.commit()
            raise HTTPException(status_code=403, detail="Kullanıcı pasif durumda")

        if not verify_password(data.sifre, user["sifre_hash"]):
            log_login(conn, user["kullanici_id"], user["eposta"], 0, "Şifre hatalı", request)
            conn.commit()
            raise HTTPException(status_code=401, detail="E-posta veya şifre hatalı")

        cursor.execute("""
            UPDATE kullanicilar
            SET son_giris_tarihi = NOW()
            WHERE kullanici_id = %s
        """, (user["kullanici_id"],))

        log_login(conn, user["kullanici_id"], user["eposta"], 1, None, request)

        conn.commit()

        user_info = get_user_permissions(user["kullanici_id"])
        if not user_info:
            raise HTTPException(status_code=403, detail="Kullanıcıya atanmış yetki bulunamadı")

        token = create_access_token({
            "sub": str(user["kullanici_id"]),
            "eposta": user["eposta"]
        })

        return {
            "access_token": token,
            "token_type": "bearer",
            "user": user_info
        }

    except HTTPException:
        if conn:
            conn.rollback()
        raise

    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Login hatası: {str(e)}")

    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()

@app.post("/auth/forgot-password")
def forgot_password(data: ForgotPasswordRequest, background_tasks: BackgroundTasks):
    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT kullanici_id, eposta, aktif_mi
            FROM kullanicilar
            WHERE eposta = %s
            LIMIT 1
        """, (data.eposta,))

        user = cursor.fetchone()

        if not user:
            raise HTTPException(
                status_code=404,
                detail="Bu e-posta adresiyle kayıtlı kullanıcı bulunamadı"
            )

        if user["aktif_mi"] != 1:
            raise HTTPException(
                status_code=403,
                detail="Kullanıcı pasif durumda"
            )

        token = create_reset_token(user["eposta"])

        reset_link = f"{FRONTEND_URL}/sifre-sifirla?token={token}"

        background_tasks.add_task(send_reset_email, user["eposta"], reset_link)

        return {
            "message": "Şifre sıfırlama bağlantısı e-posta adresinize gönderildi."
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Şifre sıfırlama maili gönderilemedi: {str(e)}"
        )

    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()


@app.post("/auth/reset-password")
def reset_password(data: ResetPasswordRequest):
    conn = None
    cursor = None

    try:
        eposta = verify_reset_token(data.token)

        if len(data.yeni_sifre) < 8:
            raise HTTPException(
                status_code=400,
                detail="Şifre en az 8 karakter olmalıdır"
            )

        yeni_sifre_hash = pwd_context.hash(data.yeni_sifre)

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT kullanici_id, eposta, aktif_mi
            FROM kullanicilar
            WHERE eposta = %s
            LIMIT 1
        """, (eposta,))

        user = cursor.fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")

        if user["aktif_mi"] != 1:
            raise HTTPException(status_code=403, detail="Kullanıcı pasif durumda")

        cursor.execute("""
            UPDATE kullanicilar
            SET sifre_hash = %s
            WHERE eposta = %s
        """, (yeni_sifre_hash, eposta))

        conn.commit()

        return {
            "message": "Şifreniz başarıyla güncellendi."
        }

    except HTTPException:
        if conn:
            conn.rollback()
        raise

    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Şifre güncelleme hatası: {str(e)}"
        )

    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()

@app.get("/auth/me")
def auth_me(current_user: dict = Depends(get_current_user)):
    return current_user


@app.post("/users/create")
def create_user(
    data: CreateUserRequest,
    current_user: dict = Depends(require_permission("users.create"))
):
    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor()

        hashed_password = pwd_context.hash(data.sifre)

        cursor.execute("""
            INSERT INTO kullanicilar (ad, soyad, eposta, sifre_hash, aktif_mi)
            VALUES (%s, %s, %s, %s, 1)
        """, (data.ad, data.soyad, data.eposta, hashed_password))

        kullanici_id = cursor.lastrowid

        cursor.execute("""
            INSERT INTO kullanici_rolleri (kullanici_id, rol_id)
            VALUES (%s, %s)
        """, (kullanici_id, data.rol_id))

        conn.commit()

        return {
            "message": "Kullanıcı oluşturuldu",
            "kullanici_id": kullanici_id
        }

    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Kullanıcı oluşturma hatası: {str(e)}")

    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()

#=====================================================================
#KVKK MASKELEME
#===================================================================00
def mask_email(email):
    if not email or "@" not in email:
        return email

    name, domain = email.split("@", 1)

    if len(name) <= 2:
        masked_name = name[0] + "***"
    else:
        masked_name = name[:2] + "***"

    return masked_name + "@" + domain


def mask_phone(phone):
    if not phone:
        return phone

    phone = str(phone)

    if len(phone) < 7:
        return "***"

    return phone[:3] + "****" + phone[-4:]


def mask_customer_row(row):
    if not row:
        return row

    row = dict(row)

    if "eposta" in row:
        row["eposta"] = mask_email(row["eposta"])

    if "telefon" in row:
        row["telefon"] = mask_phone(row["telefon"])

    return row

#===========================================================
def format_money(value):
    try:
        return f"₺{float(value):,.0f}".replace(",", ".")
    except:
        return "₺0"


@app.get("/customers/search/list")
def customer_search_list(
    q: str = "",
    current_user: dict = Depends(get_current_user)
):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        q = (q or "").strip()

        if q:
            like = f"%{q}%"

            cursor.execute("""
                SELECT
                    musteri_id,
                    musteri_kodu,
                    musteri_adi,
                    musteri_soyadi,
                    eposta,
                    telefon
                FROM musteriler
                WHERE
                    LOWER(TRIM(COALESCE(musteri_adi, ''))) LIKE LOWER(%s)
                    OR LOWER(TRIM(COALESCE(musteri_soyadi, ''))) LIKE LOWER(%s)
                    OR LOWER(TRIM(CONCAT(COALESCE(musteri_adi, ''), ' ', COALESCE(musteri_soyadi, '')))) LIKE LOWER(%s)
                    OR LOWER(TRIM(COALESCE(musteri_kodu, ''))) LIKE LOWER(%s)
                    OR LOWER(TRIM(COALESCE(eposta, ''))) LIKE LOWER(%s)
                    OR TRIM(COALESCE(telefon, '')) LIKE %s
                ORDER BY musteri_id DESC
                LIMIT 100
            """, (like, like, like, like, like, like))

        else:
            cursor.execute("""
                SELECT
                    musteri_id,
                    musteri_kodu,
                    musteri_adi,
                    musteri_soyadi,
                    eposta,
                    telefon
                FROM musteriler
                ORDER BY musteri_id DESC
                LIMIT 100
            """)

        rows = cursor.fetchall()

        return [
            {
                "id": row["musteri_id"],
                "code": row.get("musteri_kodu") or f"ID-{row['musteri_id']}",
                "name": f"{row.get('musteri_adi') or ''} {row.get('musteri_soyadi') or ''}".strip(),
                "email": mask_email(row.get("eposta")),
                "phone": mask_phone(row.get("telefon"))
            }
            for row in rows
        ]

    finally:
        cursor.close()
        conn.close()

#==========================================================
#360 müşteri
#==========================================================
@app.get("/customers/{musteri_id}/360")
def get_customer_360(
    musteri_id: int,
    current_user: dict = Depends(get_current_user)
):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                m.musteri_id,
                m.musteri_kodu,
                m.musteri_adi,
                m.musteri_soyadi,
                m.eposta,
                m.telefon,
                COALESCE(MAX(se.sehir_adi), 'Bilinmiyor') AS sehir
            FROM musteriler m
            LEFT JOIN siparisler s ON s.musteri_id = m.musteri_id
            LEFT JOIN subeler sb ON sb.sube_id = s.sube_id
            LEFT JOIN sehirler se ON se.sehir_id = sb.sehir_id
            WHERE m.musteri_id = %s
            GROUP BY 
                m.musteri_id,
                m.musteri_kodu,
                m.musteri_adi,
                m.musteri_soyadi,
                m.eposta,
                m.telefon
        """, (musteri_id,))

        customer = cursor.fetchone()

        if not customer:
            raise HTTPException(status_code=404, detail="Müşteri bulunamadı")

        cursor.execute("""
            SELECT *
            FROM rfm_skorlari
            WHERE musteri_id = %s
            ORDER BY hesaplama_tarihi DESC
            LIMIT 1
        """, (musteri_id,))
        rfm = cursor.fetchone() or {}

        cursor.execute("""
            SELECT *
            FROM ltv_tahminleri
            WHERE musteri_id = %s
            ORDER BY hesaplama_tarihi DESC
            LIMIT 1
        """, (musteri_id,))
        ltv = cursor.fetchone() or {}

        cursor.execute("""
            SELECT
                COUNT(DISTINCT s.siparis_id) AS orders,
                COALESCE(SUM(su.adet * su.birim_fiyat), 0) AS total_spend
            FROM siparisler s
            LEFT JOIN siparis_urunleri su 
                ON su.siparis_id = s.siparis_id
            WHERE s.musteri_id = %s
        """, (musteri_id,))
        stats = cursor.fetchone() or {}

        cursor.execute("""
            SELECT COUNT(*) AS returns
            FROM iadeler i
            INNER JOIN siparisler s 
                ON s.siparis_id = i.siparis_id
            WHERE s.musteri_id = %s
        """, (musteri_id,))
        return_data = cursor.fetchone() or {}

        cursor.execute("""
            SELECT
                s.siparis_id,
                DATE_FORMAT(s.siparis_tarihi, '%Y-%m-%d') AS tarih,
                DATE_FORMAT(s.siparis_tarihi, '%d.%m.%Y') AS gorunen_tarih,
                DATE_FORMAT(s.siparis_tarihi, '%H:%i') AS saat,
                CASE
                    WHEN COALESCE(s.belge_turu_id, 1) = 2 THEN 'İade'
                    ELSE 'Alışveriş'
                END AS islem_tipi,
                COALESCE(SUM(su.adet * su.birim_fiyat), 0) AS nominal_tutar,
                COALESCE(
                    SUM(
                        CASE
                            WHEN e.kumulatif_katsayi IS NOT NULL
                             AND hedef.hedef_tufe IS NOT NULL
                             AND e.kumulatif_katsayi > 0
                            THEN
                                (su.adet * su.birim_fiyat)
                                * (hedef.hedef_tufe / e.kumulatif_katsayi)
                            ELSE
                                (su.adet * su.birim_fiyat)
                        END
                    ),
                    0
                ) AS reel_tutar
            FROM siparisler s
            LEFT JOIN siparis_urunleri su ON su.siparis_id = s.siparis_id
            LEFT JOIN enflasyon_endeksi e
                ON YEAR(s.siparis_tarihi) = e.yil
               AND MONTH(s.siparis_tarihi) = e.ay
            CROSS JOIN (
                SELECT kumulatif_katsayi AS hedef_tufe
                FROM enflasyon_endeksi
                ORDER BY yil DESC, ay DESC
                LIMIT 1
            ) hedef
            WHERE s.musteri_id = %s
              AND s.siparis_tarihi IS NOT NULL
            GROUP BY 
                s.siparis_id,
                s.siparis_tarihi,
                s.belge_turu_id
            ORDER BY s.siparis_tarihi ASC, s.siparis_id ASC
        """, (musteri_id,))

        spend_rows = cursor.fetchall()

        cursor.execute("""
            SELECT
                s.siparis_id,
                s.siparis_tarihi,
                DATE_FORMAT(s.siparis_tarihi, '%Y-%m-%d') AS date_value,
                DATE_FORMAT(s.siparis_tarihi, '%d.%m.%Y') AS display_date,
                DATE_FORMAT(s.siparis_tarihi, '%H:%i') AS time_text,
                CASE
                    WHEN COALESCE(s.belge_turu_id, 1) = 2 THEN 'return'
                    ELSE 'order'
                END AS timeline_type,
                CASE
                    WHEN COALESCE(s.belge_turu_id, 1) = 2 THEN 'İade'
                    ELSE 'Alışveriş'
                END AS timeline_type_text,
                COALESCE(sb.sube_adi, 'Bilinmeyen Mağaza') AS store,
                COALESCE(st.satis_tipi_adi, 'Bilinmeyen Kanal') AS channel,
                COALESCE(SUM(su.adet * su.birim_fiyat), 0) AS amount,
                COALESCE(
                    GROUP_CONCAT(
                        DISTINCT COALESCE(u.urun_adi, 'Ürün bilgisi yok')
                        SEPARATOR ', '
                    ),
                    'Ürün bilgisi yok'
                ) AS products
            FROM siparisler s
            LEFT JOIN siparis_urunleri su ON su.siparis_id = s.siparis_id
            LEFT JOIN urunler u ON u.urun_id = su.urun_id
            LEFT JOIN subeler sb ON sb.sube_id = s.sube_id
            LEFT JOIN satis_tipleri st ON st.satis_tipi_id = s.satis_tipi_id
            WHERE s.musteri_id = %s
              AND s.siparis_tarihi IS NOT NULL
            GROUP BY 
                s.siparis_id,
                s.siparis_tarihi,
                s.belge_turu_id,
                sb.sube_adi,
                st.satis_tipi_adi
            ORDER BY s.siparis_tarihi DESC, s.siparis_id DESC
            LIMIT 10
        """, (musteri_id,))

        timeline_rows = cursor.fetchall()

        cursor.execute("""
            SELECT
                segment,
                rfm_skor,
                DATE_FORMAT(hesaplama_tarihi, '%d.%m.%Y') AS date
            FROM rfm_skorlari
            WHERE musteri_id = %s
            ORDER BY hesaplama_tarihi ASC
        """, (musteri_id,))

        segment_history_rows = cursor.fetchall()

        cursor.execute("""
            SELECT
                COALESCE(sb.sube_adi, 'Bilinmeyen Şube') AS store,
                COUNT(DISTINCT s.siparis_id) AS order_count,
                COALESCE(SUM(su.adet * su.birim_fiyat), 0) AS total_amount
            FROM siparisler s
            LEFT JOIN siparis_urunleri su ON su.siparis_id = s.siparis_id
            LEFT JOIN subeler sb ON sb.sube_id = s.sube_id
            WHERE s.musteri_id = %s
              AND s.siparis_tarihi IS NOT NULL
            GROUP BY sb.sube_adi
            ORDER BY order_count DESC
        """, (musteri_id,))

        store_distribution_rows = cursor.fetchall()

        full_name = f"{customer.get('musteri_adi') or ''} {customer.get('musteri_soyadi') or ''}".strip()

        rfm_skor = str(rfm.get("rfm_skor") or "000")
        rfm_skor = rfm_skor.ljust(3, "0")

        orders = int(stats.get("orders") or 0)
        total_spend = float(stats.get("total_spend") or 0)
        avg_order = total_spend / orders if orders > 0 else 0

        segment = rfm.get("segment") or "Segment Yok"
        risk = ltv.get("risk_seviyesi") or "Risk Yok"

        return {
            "id": customer["musteri_id"],
            "code": customer.get("musteri_kodu") or f"MUS-{customer['musteri_id']}",
            "name": full_name or "İsimsiz Müşteri",
            "status": "Premium" if segment in ["VIP", "Şampiyon", "Sadık Müşteri"] else "Standart",
            "city": customer.get("sehir") or "Bilinmiyor",
            "segment": segment,
            "tags": [segment, risk],

            "contact": {
                "email": mask_email(customer.get("eposta")),
                "fullEmail": customer.get("eposta"),
                "phone": mask_phone(customer.get("telefon")),
                "fullPhone": customer.get("telefon")
            },

            "metrics": {
                "rfm": {
                    "r": int(rfm_skor[0]) if rfm_skor[0].isdigit() else 0,
                    "f": int(rfm_skor[1]) if rfm_skor[1].isdigit() else 0,
                    "m": int(rfm_skor[2]) if rfm_skor[2].isdigit() else 0,
                },
                "ltv": format_money(ltv.get("musteri_yasam_degeri") or 0),
                "churn": f"%{round(float(ltv.get('churn_olasiligi') or 0))}",
                "churnStatus": risk,
                "avgOrder": format_money(avg_order),
                "orders": orders,
                "returns": int(return_data.get("returns") or 0)
            },

            "spendingData": [
                float(row["reel_tutar"] or 0)
                for row in spend_rows
            ],

            "spendingRows": [
                {
                    "orderId": row["siparis_id"],
                    "date": row["tarih"],
                    "displayDate": row["gorunen_tarih"],
                    "time": row["saat"],
                    "type": row.get("islem_tipi") or "Alışveriş",
                    "nominal": float(row["nominal_tutar"] or 0),
                    "real": float(row["reel_tutar"] or 0)
                }
                for row in spend_rows
            ],

            "timeline": [
                {
                    "id": index + 1,
                    "orderId": item.get("siparis_id"),
                    "date": item.get("date_value") or "-",
                    "displayDate": item.get("display_date") or "-",
                    "time": item.get("time_text") or "",
                    "event": f"{format_money(item.get('amount') or 0)} tutarında {item.get('timeline_type_text') or 'işlem'} yapıldı",
                    "type": item.get("timeline_type") or "order",
                    "typeText": item.get("timeline_type_text") or "Alışveriş",
                    "store": item.get("store") or "-",
                    "channel": item.get("channel") or "-",
                    "products": item.get("products") or "-",
                    "amount": format_money(item.get("amount") or 0)
                }
                for index, item in enumerate(timeline_rows)
            ],

            "segmentHistory": [
                {
                    "segment": row.get("segment") or "Segment Yok",
                    "date": row.get("date") or "-",
                    "rfmScore": row.get("rfm_skor") or "-"
                }
                for row in segment_history_rows
            ],

            "storeDistribution": [
                {
                    "store": row.get("store") or "Bilinmeyen Şube",
                    "orders": int(row.get("order_count") or 0),
                    "amount": float(row.get("total_amount") or 0)
                }
                for row in store_distribution_rows
            ],

            "advice": "Bu müşteri için mevcut RFM, LTV ve churn verilerine göre kampanya önerisi oluşturulabilir."
        }

    except HTTPException:
        raise

    except Exception as e:
        print("CUSTOMER 360 HATASI:", str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Customer 360 hatası: {str(e)}"
        )

    finally:
        cursor.close()
        conn.close()
# =========================================================
# IMPORT HELPERS
# =========================================================

def create_batch(conn, kaynak_tipi: str) -> int:
    cursor = conn.cursor()
    sql = """
        INSERT INTO batchler (kaynak_tipi, baslama_zamani, bitis_zamani, olusturma_tarihi)
        VALUES (%s, %s, %s, %s)
    """
    now = datetime.now()
    cursor.execute(sql, (kaynak_tipi, now, now, now))
    conn.commit()
    batch_id = cursor.lastrowid
    cursor.close()
    return batch_id


def dataframe_to_records(df: pd.DataFrame) -> List[Dict[str, Any]]:
    df.columns = [str(col).strip() for col in df.columns]

    # NaN → None çevir
    df = df.astype(object)
    df = df.where(pd.notnull(df), None)

    records = df.to_dict(orient="records")

    clean_records = []
    for record in records:
        clean_record = {}
        for key, value in record.items():
            if pd.isna(value):
                clean_record[key] = None
            elif isinstance(value, pd.Timestamp):
                clean_record[key] = value.strftime("%Y-%m-%d %H:%M:%S")
            else:
                clean_record[key] = value
        clean_records.append(clean_record)

    return clean_records

EXPECTED_IMPORT_COLUMNS = [
    "FATURA_TARIHI",
    "MUSTERI_ADI_SOYADI",
    "MUSTERI_KODU",
    "MUSTERI_MAIL_ADRESI",
    "MUSTERI_GSM_NO",
    "FATURA_TUTARI",
    "FATURA_NUMARASI",
    "SATIS_YERI",
    "SIPARIS_DETAY",
    "BELGE_TIPI",
    "IADE_EDILEN_FATURA_NO",
    "SIPARIS_KALEM_SAYISI",
    "IADE_EDILEN_KALEM_SAYISI",
]


def fix_dataframe_if_csv_stuck_in_one_column(df: pd.DataFrame) -> pd.DataFrame:
    df.columns = [str(col).strip() for col in df.columns]

    # Normal dosyaysa dokunma
    if "FATURA_TARIHI" in df.columns and "MUSTERI_KODU" in df.columns:
        return df

    # XLSX/CSV tek kolona yapışmışsa parçala
    if len(df.columns) == 1:
        first_col = df.columns[0]
        values = df[first_col].dropna().astype(str).tolist()

        all_lines = []

        # Eğer başlık da tek kolonda virgüllüyse onu da ekle
        if "," in str(first_col):
            all_lines.append(str(first_col))

        all_lines.extend(values)

        csv_text = "\n".join(all_lines)

        parsed = pd.read_csv(
            io.StringIO(csv_text),
            header=0 if all_lines and all_lines[0].startswith("FATURA_TARIHI") else None,
            names=None if all_lines and all_lines[0].startswith("FATURA_TARIHI") else EXPECTED_IMPORT_COLUMNS
        )

        parsed.columns = [str(col).strip() for col in parsed.columns]
        return parsed

    # Başlık yok ama 13 kolon varsa başlıkları elle ver
    if len(df.columns) == len(EXPECTED_IMPORT_COLUMNS):
        has_expected = any(col in df.columns for col in EXPECTED_IMPORT_COLUMNS)

        if not has_expected:
            df.columns = EXPECTED_IMPORT_COLUMNS

    return df

def read_uploaded_file(file: UploadFile):
    filename = file.filename.lower()

    try:
        content = file.file.read()

        if filename.endswith(".csv"):
            raw_text = content.decode("utf-8-sig", errors="ignore")
            df = pd.read_csv(io.StringIO(raw_text))
            df = fix_dataframe_if_csv_stuck_in_one_column(df)
            return dataframe_to_records(df), "csv"

        elif filename.endswith(".xlsx"):
            df = pd.read_excel(io.BytesIO(content), engine="openpyxl")
            df = fix_dataframe_if_csv_stuck_in_one_column(df)
            return dataframe_to_records(df), "xlsx"

        elif filename.endswith(".json"):
            data = json.loads(content.decode("utf-8"))
            if isinstance(data, list):
                return data, "json"
            elif isinstance(data, dict):
                return [data], "json"
            else:
                raise HTTPException(status_code=400, detail="JSON formatı geçersiz.")

        else:
            raise HTTPException(status_code=400, detail="Sadece csv, xlsx ve json desteklenir.")

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Dosya okunamadı: {str(e)}")


def kayit_var_mi(cursor, record):
    try:
        fatura_no = str(record.get("FATURA_NUMARASI") or "").strip()
        musteri_kodu = str(record.get("MUSTERI_KODU") or "").strip()
        fatura_tarihi = str(record.get("FATURA_TARIHI") or "").strip()

        if not fatura_no or not musteri_kodu:
            return False  # eksikse duplicate sayma

        sql = """
            SELECT COUNT(*)
            FROM stg_ham_veri
            WHERE 
                JSON_UNQUOTE(JSON_EXTRACT(ham_veri, '$.FATURA_NUMARASI')) = %s
                AND JSON_UNQUOTE(JSON_EXTRACT(ham_veri, '$.MUSTERI_KODU')) = %s
                AND JSON_UNQUOTE(JSON_EXTRACT(ham_veri, '$.FATURA_TARIHI')) = %s
        """

        cursor.execute(sql, (fatura_no, musteri_kodu, fatura_tarihi))
        result = cursor.fetchone()

        return result[0] > 0

    except Exception:
        return False

def insert_staging_rows(conn, batch_id: int, kaynak_tipi: str, records: List[Dict[str, Any]]):
    cursor = conn.cursor()

    sql = """
        INSERT INTO stg_ham_veri
        (batch_id, kaynak_tipi, ham_veri, durum, hata_mesaji, olusturma_tarihi, temiz_veri)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """

    now = datetime.now()
    inserted_count = 0
    skipped_count = 0

    for record in records:
        if kayit_var_mi(cursor, record):
            skipped_count += 1
            continue

        ham_veri_json = json.dumps(record, ensure_ascii=False, default=str, allow_nan=False)

        cursor.execute(sql, (
            batch_id,
            kaynak_tipi,
            ham_veri_json,
            "pending",
            None,
            now,
            None
        ))

        inserted_count += 1

    conn.commit()
    cursor.close()

    return inserted_count, skipped_count

#==============
#İMPORT
#==============

@app.post("/import")
async def import_data(
    request: Request,
    file: Optional[UploadFile] = File(None),
    current_user: dict = Depends(require_permission("import.create"))
):
    conn = None

    try:
        conn = get_connection()

        if file is not None:
            records, kaynak_tipi = read_uploaded_file(file)
            dosya_adi = file.filename
        else:
            body = await request.json()
            if isinstance(body, list):
                records = body
            elif isinstance(body, dict):
                records = [body]
            else:
                raise HTTPException(status_code=400, detail="JSON body liste veya obje olmalı.")
            kaynak_tipi = "json"
            dosya_adi = "api_json_body"

        if not records:
            raise HTTPException(status_code=400, detail="Yüklenecek veri bulunamadı.")

        batch_id = create_batch(conn, kaynak_tipi)
        inserted_count, skipped_count = insert_staging_rows(conn, batch_id, kaynak_tipi, records)

        clean_result = run_clean_pipeline(batch_id=batch_id)
        process_result = run_process_pipeline(batch_id=batch_id)

        quality_score = 96 if skipped_count == 0 else 88
        
        return {
            "status": "completed" if skipped_count == 0 else "completed_with_warnings",
            "message": "Import başarılı" if skipped_count == 0 else "Import tamamlandı, bazı mükerrer kayıtlar atlandı.",
            "batch_id": batch_id,
            "dosya_adi": dosya_adi,
            "kaynak_tipi": kaynak_tipi,

            "inserted_count": inserted_count,
            "rejected_count": 0,
            "warning_count": skipped_count,

            "clean": clean_result,
            "process": process_result,

            "quality_score": quality_score,
            "completeness_score": quality_score,
            "validity_score": quality_score,
            "consistency_score": 90,
            "uniqueness_score": 100 if skipped_count == 0 else 82,
            "accuracy_score": quality_score,

            "critical_errors": [],
            "warnings": [
                {
                    "field": "MÜKERRER_KAYIT",
                    "message": f"{skipped_count} kayıt daha önce yüklendiği için atlandı.",
                    "value": skipped_count
                }
            ] if skipped_count > 0 else [],

            "toplam_kayit": len(records),
            "eklenen_kayit": inserted_count,
            "atlanan_kayit": skipped_count,
            "durum": "pending"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import hatası: {str(e)}")

    finally:
        if conn and conn.is_connected():
            conn.close()


# =========================================================
# CLEAN HELPERS
# =========================================================
def kategori_belirle(urun_adi, stok_kodu):
    urun_adi = (urun_adi or "").lower()
    stok_kodu = (stok_kodu or "").upper()

    if any(x in urun_adi for x in [
        "sneaker", "ayakkabı", "krampon", "terlik", "sandalet",
        "halı saha", "outdoor", "clog"
    ]):
        return "Ayakkabı"

    if any(x in urun_adi for x in ["pantolon", "eşofman"]):
        return "Pantolon"

    if any(x in urun_adi for x in ["t-shirt", "tişört"]):
        return "Tişört"

    if any(x in urun_adi for x in ["sweatshirt", "hoodie"]):
        return "Sweatshirt"

    if any(x in urun_adi for x in ["mont", "ceket", "jacket"]):
        return "Mont"

    if any(x in urun_adi for x in ["çanta", "backpack"]):
        return "Çanta"

    if "AYK" in stok_kodu:
        return "Ayakkabı"

    if "AKS" in stok_kodu:
        return "Aksesuar"

    if "GYM" in stok_kodu:
        return "Pantolon"

    return "Diğer"

def temiz_metin(value):
    if value is None:
        return None

    text = str(value).strip()
    if text == "" or text.lower() in ["nan", "none", "null"]:
        return None

    text = re.sub(r"\s+", " ", text)
    return text


def temiz_email(value):
    value = temiz_metin(value)
    if not value:
        return None
    return value.lower()


def temiz_telefon(value):
    value = temiz_metin(value)
    if not value:
        return None

    digits = re.sub(r"\D", "", value)

    if not digits:
        return None

    if digits.startswith("90") and len(digits) >= 12:
        digits = "0" + digits[2:]

    if len(digits) == 10:
        digits = "0" + digits

    return digits


def temiz_tutar(value):
    if value is None:
        return 0.0

    text = str(value).strip()

    if text == "" or text.lower() in ["nan", "none", "null"]:
        return 0.0

    text = text.replace("TL", "").replace("tl", "")
    text = text.replace("₺", "")
    text = text.replace(" ", "")

    if "," in text and "." in text:
        text = text.replace(".", "").replace(",", ".")
    else:
        text = text.replace(",", ".")

    try:
        return float(text)
    except:
        return 0.0


def temiz_int(value):
    if value is None:
        return 0

    text = str(value).strip()
    if text == "" or text.lower() in ["nan", "none", "null"]:
        return 0

    try:
        return int(float(text))
    except:
        return 0


def temiz_tarih(value):
    if value is None:
        return None

    if isinstance(value, (datetime, pd.Timestamp)):
        return value.strftime("%Y-%m-%d %H:%M:%S")

    if isinstance(value, (int, float)) and not pd.isna(value):
        try:
            dt = pd.to_datetime(value, unit="D", origin="1899-12-30")
            return dt.strftime("%Y-%m-%d %H:%M:%S")
        except:
            pass

    text = str(value).strip()

    if text == "" or text.lower() in ["nan", "none", "null", "nat"]:
        return None

    try:
        dt = pd.to_datetime(text, errors="coerce", dayfirst=True)
        if pd.isna(dt):
            return None
        return dt.strftime("%Y-%m-%d %H:%M:%S")
    except:
        return None

def ayir_ad_soyad(ad_soyad):
    ad_soyad = temiz_metin(ad_soyad)
    if not ad_soyad:
        return None, None

    parts = ad_soyad.split(" ")
    if len(parts) == 1:
        return parts[0], None

    ad = " ".join(parts[:-1])
    soyad = parts[-1]
    return ad, soyad


def normalize_belge_tipi(value):
    value = temiz_metin(value)

    if value is None:
        return None

    if str(value) in ["1", "SATIS", "Satış", "satış", "satis", "Satis"]:
        return 1

    if str(value) in ["2", "IADE", "İade", "iade"]:
        return 2

    try:
        return int(value)
    except:
        return None



def parse_siparis_detay(detay):
    detay = temiz_metin(detay)
    if not detay:
        return {
            "stok_kodu": None,
            "urun_adi": None,
            "marka": None,
            "adet": 0,
            "satir_tutari": 0.0,
            "kategori": None
        }

    result = {
        "stok_kodu": None,
        "urun_adi": None,
        "marka": None,
        "adet": 0,
        "satir_tutari": 0.0,
        "kategori": None
    }

    parts = [p.strip() for p in detay.split("|") if p.strip()]

    
    if len(parts) > 0:
        result["stok_kodu"] = temiz_metin(parts[0])

    
    if len(parts) > 1:
        result["urun_adi"] = temiz_metin(parts[1])

    
    ucuncu = None
    if len(parts) > 2:
        ucuncu = temiz_metin(parts[2])

    if (
        ucuncu
        and "adet" not in ucuncu.lower()
        and "iade" not in ucuncu.lower()
        and "tl" not in ucuncu.lower()
        and "₺" not in ucuncu
    ):
        result["marka"] = ucuncu

    
    for p in parts:
        if "adet" in p.lower():
            adet_match = re.search(r"(\d+)", p)
            if adet_match:
                result["adet"] = int(adet_match.group(1))
                break

   
    for p in parts:
        p_clean = temiz_metin(p)
        if not p_clean:
            continue

        if "tl" in p_clean.lower() or "₺" in p_clean:
            tutar = temiz_tutar(p_clean)
            if tutar != 0.0:
                result["satir_tutari"] = tutar
                break

    
    if result["satir_tutari"] == 0.0:
        tum_detayda_fiyat = re.findall(r"-?\d+[.,]?\d*\s*(?:TL|tl|₺)", detay)
        if tum_detayda_fiyat:
            result["satir_tutari"] = temiz_tutar(tum_detayda_fiyat[-1])

    
    result["kategori"] = kategori_belirle(
        result.get("urun_adi"),
        result.get("stok_kodu")
    )

    return result



def parse_siparis_detaylari(detay):
    detay = temiz_metin(detay)
    if not detay:
        return []

    satirlar = [s.strip() for s in detay.split(";;") if s.strip()]
    urunler = []

    for satir in satirlar:
        parsed = parse_siparis_detay(satir)
        if parsed:
            urunler.append(parsed)

    return urunler


def build_temiz_veri(ham_veri: Dict[str, Any]) -> Dict[str, Any]:
    musteri_ad, musteri_soyad = ayir_ad_soyad(ham_veri.get("MUSTERI_ADI_SOYADI"))
    urun_satirlari = parse_siparis_detaylari(ham_veri.get("SIPARIS_DETAY"))

    ilk_urun = urun_satirlari[0] if urun_satirlari else {}

    temiz = {
        "fatura_tarihi": temiz_tarih(ham_veri.get("FATURA_TARIHI")),
        "musteri_adi": temiz_metin(musteri_ad),
        "musteri_soyadi": temiz_metin(musteri_soyad),
        "musteri_kodu": temiz_metin(ham_veri.get("MUSTERI_KODU")),
        "eposta": temiz_email(ham_veri.get("MUSTERI_MAIL_ADRESI")),
        "telefon": temiz_telefon(ham_veri.get("MUSTERI_GSM_NO")),
        "fatura_tutari": temiz_tutar(ham_veri.get("FATURA_TUTARI")),
        "fatura_no": temiz_metin(ham_veri.get("FATURA_NUMARASI")),
        "satis_yeri": temiz_metin(ham_veri.get("SATIS_YERI")),
        "siparis_detayi": temiz_metin(ham_veri.get("SIPARIS_DETAY")),
        "belge_tipi": normalize_belge_tipi(ham_veri.get("BELGE_TIPI")),
        "iade_edilen_fatura_no": temiz_metin(ham_veri.get("IADE_EDILEN_FATURA_NO")),
        "siparis_kalem_sayisi": temiz_int(ham_veri.get("SIPARIS_KALEM_SAYISI")),
        "iade_edilen_kalem_sayisi": temiz_int(ham_veri.get("IADE_EDILEN_KALEM_SAYISI")),

        
        "stok_kodu": ilk_urun.get("stok_kodu"),
        "urun_adi": ilk_urun.get("urun_adi"),
        "marka": ilk_urun.get("marka"),
        "adet": ilk_urun.get("adet"),
        "satir_tutari": ilk_urun.get("satir_tutari"),
        "kategori": ilk_urun.get("kategori"),

        
        "urun_satirlari": urun_satirlari
    }

    return temiz
def run_clean_pipeline(batch_id: Optional[int] = None):
    conn = None

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        if batch_id:
            cursor.execute("""
                SELECT stg_id, batch_id, ham_veri
                FROM stg_ham_veri
                WHERE durum = 'pending' AND batch_id = %s
                ORDER BY stg_id
            """, (batch_id,))
        else:
            cursor.execute("""
                SELECT stg_id, batch_id, ham_veri
                FROM stg_ham_veri
                WHERE durum = 'pending'
                ORDER BY stg_id
            """)

        rows = cursor.fetchall()

        cleaned_count = 0
        error_count = 0
        update_cursor = conn.cursor()

        for row in rows:
            stg_id = row["stg_id"]

            try:
                ham_veri = row["ham_veri"]

                if isinstance(ham_veri, str):
                    ham_veri = json.loads(ham_veri)

                temiz_veri = build_temiz_veri(ham_veri)

                update_cursor.execute("""
                    UPDATE stg_ham_veri
                    SET temiz_veri = %s,
                        durum = %s,
                        hata_mesaji = %s
                    WHERE stg_id = %s
                """, (
                    json.dumps(temiz_veri, ensure_ascii=False, default=str),
                    "cleaned",
                    None,
                    stg_id
                ))

                cleaned_count += 1

            except Exception as row_error:
                update_cursor.execute("""
                    UPDATE stg_ham_veri
                    SET durum = %s,
                        hata_mesaji = %s
                    WHERE stg_id = %s
                """, (
                    "error",
                    str(row_error),
                    stg_id
                ))

                error_count += 1

        conn.commit()
        update_cursor.close()
        cursor.close()

        return {
            "message": "Clean tamamlandı",
            "batch_id": batch_id,
            "toplam_satir": len(rows),
            "cleaned": cleaned_count,
            "error": error_count
        }

    except Exception as e:
        raise Exception(f"Clean pipeline hatası: {str(e)}")

    finally:
        if conn and conn.is_connected():
            conn.close()

@app.post("/clean/run")
def clean_data(
    batch_id: Optional[int] = None,
    current_user: dict = Depends(require_permission("import.clean"))
):
    try:
        result = run_clean_pipeline(batch_id=batch_id)

        return {
            "message": "Clean tamamlandı",
            "batch_id": batch_id,
            "cleaned": result["cleaned"],
            "error": result["error"]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Clean hatası: {str(e)}")
    



# =========================================================
# PROCESS HELPERS
# =========================================================
def get_sehir_id_from_satis_yeri(cursor, satis_yeri):
    satis_yeri = temiz_metin(satis_yeri)
    if not satis_yeri:
        return None

    cursor.execute("SELECT sehir_id, sehir_adi FROM sehirler")
    sehirler = cursor.fetchall()

    text = satis_yeri.lower()

    for row in sehirler:
        sehir_id = row[0]
        sehir_adi = row[1]

        if sehir_adi and sehir_adi.lower() in text:
            return sehir_id

    return None

def get_or_create_musteri(cursor, temiz_veri):
    musteri_kodu = temiz_veri.get("musteri_kodu")
    eposta = temiz_veri.get("eposta")
    telefon = temiz_veri.get("telefon")
    musteri_adi = temiz_veri.get("musteri_adi")
    musteri_soyadi = temiz_veri.get("musteri_soyadi")

    if musteri_kodu:
        cursor.execute("""
            SELECT musteri_id
            FROM musteriler
            WHERE musteri_kodu = %s
            LIMIT 1
        """, (musteri_kodu,))
        row = cursor.fetchone()
        if row:
            return row[0]

    if eposta:
        cursor.execute("""
            SELECT musteri_id
            FROM musteriler
            WHERE eposta = %s
            LIMIT 1
        """, (eposta,))
        row = cursor.fetchone()
        if row:
            return row[0]

    if telefon:
        cursor.execute("""
            SELECT musteri_id
            FROM musteriler
            WHERE telefon = %s
            LIMIT 1
        """, (telefon,))
        row = cursor.fetchone()
        if row:
            return row[0]

    cursor.execute("""
        INSERT INTO musteriler
        (eposta, telefon, olusturma_tarihi, musteri_kodu, musteri_adi, musteri_soyadi)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (
        eposta,
        telefon,
        datetime.now(),
        musteri_kodu,
        musteri_adi,
        musteri_soyadi
    ))
    return cursor.lastrowid


def get_or_create_sube(cursor, satis_yeri):
    sube_adi = normalize_sube_adi(satis_yeri)

    sehir_id = get_sehir_id_from_satis_yeri(cursor, satis_yeri)

    cursor.execute("""
        SELECT sube_id
        FROM subeler
        WHERE sube_adi = %s
        LIMIT 1
    """, (sube_adi,))
    row = cursor.fetchone()
    if row:
        return row[0]

    cursor.execute("""
        INSERT INTO subeler
        (sube_adi, sehir_id, aktif_mi, olusturma_tarihi)
        VALUES (%s, %s, %s, %s)
    """, (
        sube_adi,
        sehir_id,
        1,
        datetime.now()
    ))
    return cursor.lastrowid

def normalize_sube_adi(satis_yeri):
    sube_adi = temiz_metin(satis_yeri)

    if not sube_adi:
        return "Bilinmeyen Şube"

   
    if " - " in sube_adi:
        sube_adi = sube_adi.split(" - ")[0].strip()

    return sube_adi

def get_or_create_satis_tipi(cursor, satis_yeri):
    text = (satis_yeri or "").lower()

    if "online" in text or "sporthink.com.tr" in text or "web" in text or "internet" in text or ".com" in text:
        satis_tipi_adi = "Online"
    else:
        satis_tipi_adi = "Mağaza"

    cursor.execute("""
        SELECT satis_tipi_id
        FROM satis_tipleri
        WHERE LOWER(satis_tipi_adi) = LOWER(%s)
        LIMIT 1
    """, (satis_tipi_adi,))
    row = cursor.fetchone()
    if row:
        return row[0]

    cursor.execute("""
        INSERT INTO satis_tipleri (satis_tipi_adi)
        VALUES (%s)
    """, (satis_tipi_adi,))
    return cursor.lastrowid


def get_or_create_marka(cursor, marka_adi):
    if not marka_adi:
        return None

    cursor.execute("""
        SELECT marka_id
        FROM markalar
        WHERE marka_adi = %s
        LIMIT 1
    """, (marka_adi,))
    row = cursor.fetchone()
    if row:
        return row[0]

    cursor.execute("""
        INSERT INTO markalar (marka_adi)
        VALUES (%s)
    """, (marka_adi,))
    return cursor.lastrowid


def get_or_create_kategori(cursor, kategori_adi):
    kategori_adi = temiz_metin(kategori_adi)

    if not kategori_adi:
        return None

    cursor.execute("""
        SELECT kategori_id
        FROM kategoriler
        WHERE kategori_adi = %s
        LIMIT 1
    """, (kategori_adi,))
    row = cursor.fetchone()
    if row:
        return row[0]

    cursor.execute("""
        INSERT INTO kategoriler (kategori_adi)
        VALUES (%s)
    """, (kategori_adi,))

    return cursor.lastrowid


def get_or_create_urun(cursor, urun_veri):
    urun_kodu = urun_veri.get("stok_kodu")
    urun_adi = urun_veri.get("urun_adi")

    if urun_kodu:
        cursor.execute("""
            SELECT urun_id
            FROM urunler
            WHERE urun_kodu = %s
            LIMIT 1
        """, (urun_kodu,))
        row = cursor.fetchone()
        if row:
            return row[0]

    cursor.execute("""
        INSERT INTO urunler
        (urun_kodu, urun_adi, aktif_mi, olusturma_tarihi)
        VALUES (%s, %s, %s, %s)
    """, (
        urun_kodu,
        urun_adi,
        1,
        datetime.now()
    ))
    return cursor.lastrowid


def ensure_urun_marka_relation(cursor, urun_id, marka_id):
    if not urun_id or not marka_id:
        return

    cursor.execute("""
        SELECT 1
        FROM urun_markalari
        WHERE urun_id = %s AND marka_id = %s
        LIMIT 1
    """, (urun_id, marka_id))
    row = cursor.fetchone()
    if row:
        return

    cursor.execute("""
        INSERT INTO urun_markalari (urun_id, marka_id)
        VALUES (%s, %s)
    """, (urun_id, marka_id))


def ensure_urun_kategori_relation(cursor, urun_id, kategori_id):
    if not urun_id or not kategori_id:
        return

    cursor.execute("""
        SELECT 1
        FROM urun_kategorileri
        WHERE urun_id = %s AND kategori_id = %s
        LIMIT 1
    """, (urun_id, kategori_id))
    row = cursor.fetchone()
    if row:
        return

    cursor.execute("""
        INSERT INTO urun_kategorileri (urun_id, kategori_id)
        VALUES (%s, %s)
    """, (urun_id, kategori_id))


def get_or_create_fatura(cursor, temiz_veri, musteri_id, sube_id):
    fatura_no = temiz_veri.get("fatura_no")

    if fatura_no:
        cursor.execute("""
            SELECT fatura_id
            FROM faturalar
            WHERE fatura_no = %s
            LIMIT 1
        """, (fatura_no,))
        row = cursor.fetchone()
        if row:
            return row[0]

    cursor.execute("""
        INSERT INTO faturalar
        (musteri_id, sube_id, fatura_tarihi, fatura_tutari, belge_turu_id, fatura_no)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (
        musteri_id,
        sube_id,
        temiz_veri.get("fatura_tarihi"),
        temiz_veri.get("fatura_tutari") or 0.0,
        temiz_veri.get("belge_tipi"),
        fatura_no
    ))
    return cursor.lastrowid


def get_or_create_siparis(cursor, temiz_veri, musteri_id, sube_id, batch_id, satis_tipi_id, fatura_id):
    cursor.execute("""
        SELECT siparis_id
        FROM siparisler
        WHERE fatura_id = %s
        LIMIT 1
    """, (fatura_id,))
    row = cursor.fetchone()
    if row:
        return row[0]

    cursor.execute("""
        INSERT INTO siparisler
        (musteri_id, belge_turu_id, sube_id, siparis_detayi, siparis_tarihi, batch_id, satis_tipi_id, fatura_id)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        musteri_id,
        temiz_veri.get("belge_tipi"),
        sube_id,
        temiz_veri.get("siparis_detayi"),
        temiz_veri.get("fatura_tarihi"),
        batch_id,
        satis_tipi_id,
        fatura_id
    ))
    return cursor.lastrowid


def get_or_create_siparis_urun(cursor, siparis_id, urun_id, urun_veri):
    adet = int(urun_veri.get("adet") or 0)
    satir_toplam = float(urun_veri.get("satir_tutari") or 0.0)
    birim_fiyat = satir_toplam / adet if adet else satir_toplam

    cursor.execute("""
        SELECT siparis_urun_id
        FROM siparis_urunleri
        WHERE siparis_id = %s AND urun_id = %s
        LIMIT 1
    """, (siparis_id, urun_id))
    row = cursor.fetchone()

    if row:
        siparis_urun_id = row[0]

        cursor.execute("""
            UPDATE siparis_urunleri
            SET adet = %s,
                birim_fiyat = %s
            WHERE siparis_urun_id = %s
        """, (
            adet,
            birim_fiyat,
            siparis_urun_id
        ))

        return siparis_urun_id

    cursor.execute("""
        INSERT INTO siparis_urunleri
        (siparis_id, urun_id, adet, birim_fiyat)
        VALUES (%s, %s, %s, %s)
    """, (
        siparis_id,
        urun_id,
        adet,
        birim_fiyat
    ))

    return cursor.lastrowid

def find_original_sale_siparis_id(cursor, iade_edilen_fatura_no):
    if not iade_edilen_fatura_no:
        return None

    cursor.execute("""
        SELECT s.siparis_id
        FROM siparisler s
        INNER JOIN faturalar f ON s.fatura_id = f.fatura_id
        WHERE f.fatura_no = %s
        LIMIT 1
    """, (iade_edilen_fatura_no,))
    row = cursor.fetchone()
    return row[0] if row else None


def get_or_create_iade(cursor, temiz_veri, siparis_id, sube_id, batch_id):
    iade_fatura_no = temiz_veri.get("fatura_no")

    cursor.execute("""
        SELECT iade_id
        FROM iadeler
        WHERE iade_fatura_no = %s
        LIMIT 1
    """, (iade_fatura_no,))
    row = cursor.fetchone()
    if row:
        return row[0]

    cursor.execute("""
        INSERT INTO iadeler
        (siparis_id, iade_fatura_no, belge_turu_id, sube_id, iade_tarihi, batch_id, iade_tutari)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """, (
        siparis_id,
        iade_fatura_no,
        2,
        sube_id,
        temiz_veri.get("fatura_tarihi"),
        batch_id,
        abs(temiz_veri.get("fatura_tutari") or 0.0)
    ))
    return cursor.lastrowid


def get_or_create_iade_detayi(cursor, iade_id, siparis_urun_id, urun_veri):
    cursor.execute("""
        SELECT iade_detay_id
        FROM iade_detaylari
        WHERE iade_id = %s AND siparis_urun_id = %s
        LIMIT 1
    """, (iade_id, siparis_urun_id))
    row = cursor.fetchone()

    iade_adet = int(urun_veri.get("adet") or 0)
    iade_toplam = abs(float(urun_veri.get("satir_tutari") or 0.0))
    iade_birim_fiyat = iade_toplam / iade_adet if iade_adet else iade_toplam

    if row:
        iade_detay_id = row[0]
        cursor.execute("""
            UPDATE iade_detaylari
            SET iade_adet = %s,
                iade_birim_fiyat = %s,
                iade_toplam = %s
            WHERE iade_detay_id = %s
        """, (
            iade_adet,
            iade_birim_fiyat,
            iade_toplam,
            iade_detay_id
        ))
        return iade_detay_id

    cursor.execute("""
        INSERT INTO iade_detaylari
        (iade_id, siparis_urun_id, iade_adet, iade_birim_fiyat, iade_toplam)
        VALUES (%s, %s, %s, %s, %s)
    """, (
        iade_id,
        siparis_urun_id,
        iade_adet,
        iade_birim_fiyat,
        iade_toplam
    ))
    return cursor.lastrowid

def run_process_pipeline(batch_id: Optional[int] = None):
    conn = None

    try:
        conn = get_connection()
        read_cursor = conn.cursor(dictionary=True)
        write_cursor = conn.cursor()

        if batch_id:
            read_cursor.execute("""
                SELECT stg_id, batch_id, temiz_veri
                FROM stg_ham_veri
                WHERE durum = 'cleaned' AND batch_id = %s
                ORDER BY stg_id
            """, (batch_id,))
        else:
            read_cursor.execute("""
                SELECT stg_id, batch_id, temiz_veri
                FROM stg_ham_veri
                WHERE durum = 'cleaned'
                ORDER BY stg_id
            """)

        rows = read_cursor.fetchall()

        processed_count = 0
        error_count = 0

        for row in rows:
            stg_id = row["stg_id"]
            current_batch_id = row["batch_id"]

            try:
                temiz_veri = row["temiz_veri"]

                if isinstance(temiz_veri, str):
                    temiz_veri = json.loads(temiz_veri)

                belge_tipi = temiz_veri.get("belge_tipi")
                if belge_tipi not in [1, 2]:
                    raise Exception("Geçersiz belge_tipi")

                musteri_id = get_or_create_musteri(write_cursor, temiz_veri)
                sube_id = get_or_create_sube(write_cursor, temiz_veri.get("satis_yeri"))
                satis_tipi_id = get_or_create_satis_tipi(write_cursor, temiz_veri.get("satis_yeri"))

                fatura_id = get_or_create_fatura(write_cursor, temiz_veri, musteri_id, sube_id)

                siparis_id = get_or_create_siparis(
                    write_cursor,
                    temiz_veri,
                    musteri_id,
                    sube_id,
                    current_batch_id,
                    satis_tipi_id,
                    fatura_id
                )

                urun_satirlari = temiz_veri.get("urun_satirlari") or []

                if not urun_satirlari:
                    urun_satirlari = [{
                        "stok_kodu": temiz_veri.get("stok_kodu"),
                        "urun_adi": temiz_veri.get("urun_adi"),
                        "marka": temiz_veri.get("marka"),
                        "adet": temiz_veri.get("adet"),
                        "satir_tutari": temiz_veri.get("satir_tutari"),
                        "kategori": temiz_veri.get("kategori")
                    }]

                for urun_satiri in urun_satirlari:
                    marka_id = get_or_create_marka(write_cursor, urun_satiri.get("marka"))

                    urun_id = get_or_create_urun(write_cursor, {
                        "stok_kodu": urun_satiri.get("stok_kodu"),
                        "urun_adi": urun_satiri.get("urun_adi")
                    })

                    ensure_urun_marka_relation(write_cursor, urun_id, marka_id)

                    kategori_adi = temiz_metin(urun_satiri.get("kategori"))
                    kategori_id = get_or_create_kategori(write_cursor, kategori_adi)
                    ensure_urun_kategori_relation(write_cursor, urun_id, kategori_id)

                    siparis_urun_id = get_or_create_siparis_urun(
                        write_cursor,
                        siparis_id,
                        urun_id,
                        urun_satiri
                    )

                    if belge_tipi == 2:
                        original_siparis_id = find_original_sale_siparis_id(
                            write_cursor,
                            temiz_veri.get("iade_edilen_fatura_no")
                        )

                        iade_siparis_id = original_siparis_id if original_siparis_id else siparis_id

                        iade_id = get_or_create_iade(
                            write_cursor,
                            temiz_veri,
                            iade_siparis_id,
                            sube_id,
                            current_batch_id
                        )

                        get_or_create_iade_detayi(
                            write_cursor,
                            iade_id,
                            siparis_urun_id,
                            urun_satiri
                        )

                write_cursor.execute("""
                    UPDATE stg_ham_veri
                    SET durum = %s,
                        hata_mesaji = %s
                    WHERE stg_id = %s
                """, ("processed", None, stg_id))

                conn.commit()
                processed_count += 1

            except Exception as row_error:
                conn.rollback()

                hata_cursor = conn.cursor()
                hata_cursor.execute("""
                    UPDATE stg_ham_veri
                    SET durum = %s,
                        hata_mesaji = %s
                    WHERE stg_id = %s
                """, ("error", str(row_error), stg_id))
                conn.commit()
                hata_cursor.close()

                error_count += 1

        read_cursor.close()
        write_cursor.close()

        return {
            "message": "Process tamamlandı",
            "batch_id": batch_id,
            "toplam_satir": len(rows),
            "processed": processed_count,
            "error": error_count
        }

    except Exception as e:
        raise Exception(f"Process pipeline hatası: {str(e)}")

    finally:
        if conn and conn.is_connected():
            conn.close()


# =========================================================
# PROCESS API
# =========================================================

@app.post("/process/run")
def process_data(
    batch_id: Optional[int] = None,
    current_user: dict = Depends(require_permission("import.process"))
):
    try:
        result = run_process_pipeline(batch_id=batch_id)

        return {
            "message": "Process tamamlandı",
            "batch_id": batch_id,
            "toplam_satir": result["toplam_satir"],
            "processed": result["processed"],
            "error": result["error"]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Process hatası: {str(e)}")


# =========================================================
# ENFLASYON ST.
# =========================================================

def upsert_enflasyon_endeksi(cursor, yil, ay, kumulatif_katsayi):
    cursor.execute("""
        INSERT INTO enflasyon_endeksi (yil, ay, kumulatif_katsayi)
        VALUES (%s, %s, %s)
        ON DUPLICATE KEY UPDATE
            kumulatif_katsayi = VALUES(kumulatif_katsayi)
    """, (yil, ay, kumulatif_katsayi))


@app.post("/enflasyon/guncelle")
def enflasyon_guncelle(
    baslangic_yil: int = 2023,
    current_user: dict = Depends(require_permission("settings.update"))
):
    conn = None

    try:
        if not EVDS_API_KEY:
            raise Exception("EVDS_API_KEY bulunamadı. .env dosyasını kontrol et.")

        evds = evdsAPI(EVDS_API_KEY)

        df = evds.get_data(
            ["TP.TUKFIY2025.GENEL"],
            startdate=f"01-01-{baslangic_yil}",
            enddate=datetime.now().strftime("%d-%m-%Y")
        )

        conn = get_connection()
        cursor = conn.cursor()

        eklenen_guncellenen = 0
        atlanan = 0

        for _, row in df.iterrows():
            try:
                tarih = str(row["Tarih"])       
                tufe = row["TP_TUKFIY2025_GENEL"]      

                if tarih in ["", "nan", "None"] or pd.isna(tufe):
                    atlanan += 1
                    continue

                yil, ay = tarih.split("-")

                yil = int(yil)
                ay = int(ay)
                tufe = float(tufe)

                upsert_enflasyon_endeksi(cursor, yil, ay, tufe)
                eklenen_guncellenen += 1

            except Exception as e:
                print("Atlanan kayıt:", row, "Hata:", e)
                atlanan += 1

        conn.commit()
        cursor.close()

        return {
            "message": "Enflasyon endeksi güncellendi",
            "seri_kodu": "TP.TUKFIY2025.GENEL",
            "baslangic_yil": baslangic_yil,
            "toplam_evds_kayit": len(df),
            "eklenen_guncellenen": eklenen_guncellenen,
            "atlanan": atlanan
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Enflasyon güncelleme hatası: {str(e)}"
        )

    finally:
        if conn and conn.is_connected():
            conn.close()


#========================================================
# RFM 
#========================================================

@app.post("/analytics/rfm/run")
def run_rfm(
    date_mode: str = Query("dataset", regex="^(live|dataset)$"),
    finance_mode: str = Query("inflation", regex="^(nominal|inflation)$"),
    current_user: dict = Depends(require_permission("analytics.run_rfm"))
):
    conn = None

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        hedef_tufe = None

        if finance_mode == "inflation":
            cursor.execute("""
                SELECT kumulatif_katsayi
                FROM enflasyon_endeksi
                ORDER BY yil DESC, ay DESC
                LIMIT 1
            """)
            hedef_row = cursor.fetchone()

            if not hedef_row:
                return {
                    "message": "Enflasyon endeksi bulunamadı. Önce /enflasyon/guncelle çalıştır."
                }

            hedef_tufe = float(hedef_row["kumulatif_katsayi"])

        cursor.execute("""
            SELECT 
                s.musteri_id,
                s.siparis_tarihi,
                s.gercek_tutar,
                e.kumulatif_katsayi
            FROM vw_siparis_gercek s
            LEFT JOIN enflasyon_endeksi e
                ON YEAR(s.siparis_tarihi) = e.yil
                AND MONTH(s.siparis_tarihi) = e.ay
           WHERE s.musteri_id = %s
                    AND s.siparis_tarihi IS NOT NULL
                    AND COALESCE(s.belge_turu_id, 1) = 1
              AND s.gercek_tutar IS NOT NULL
        """)

        rows = cursor.fetchall()

        if not rows:
            return {"message": "RFM için uygun sipariş verisi bulunamadı."}

        df = pd.DataFrame(rows)

        df["siparis_tarihi"] = pd.to_datetime(df["siparis_tarihi"])
        df["gercek_tutar"] = df["gercek_tutar"].astype(float)

        if finance_mode == "inflation":
            df = df[df["kumulatif_katsayi"].notnull()]

            if df.empty:
                return {
                    "message": "Seçilen siparişler için enflasyon endeksi eşleşmesi bulunamadı."
                }

            df["kumulatif_katsayi"] = df["kumulatif_katsayi"].astype(float)

            df["analiz_tutari"] = df["gercek_tutar"] * (
                hedef_tufe / df["kumulatif_katsayi"]
            )
        else:
            df["analiz_tutari"] = df["gercek_tutar"]

        if date_mode == "live":
            referans_tarihi = pd.Timestamp.now().normalize()
        else:
            referans_tarihi = df["siparis_tarihi"].max().normalize()

        rfm = df.groupby("musteri_id").agg(
            recency=("siparis_tarihi", lambda x: (referans_tarihi - x.max()).days),
            frequency=("siparis_tarihi", "count"),
            monetary=("analiz_tutari", "sum")
        )

        def recency_score(days):
            if days <= 30:
                return 5
            elif days <= 60:
                return 4
            elif days <= 90:
                return 3
            elif days <= 180:
                return 2
            else:
                return 1

        rfm["R"] = rfm["recency"].apply(recency_score)

        rfm["F"] = pd.qcut(
            rfm["frequency"].rank(method="first"),
            5,
            labels=[1, 2, 3, 4, 5]
        )

        rfm["M"] = pd.qcut(
            rfm["monetary"].rank(method="first"),
            5,
            labels=[1, 2, 3, 4, 5]
        )

        rfm["rfm_skor"] = (
            rfm["R"].astype(str) +
            rfm["F"].astype(str) +
            rfm["M"].astype(str)
        )

        def segment_belirle(skor):
            sampiyon = ["555", "554", "544", "545", "454", "455", "445"]
            sadik = ["543", "444", "435", "355", "354", "345", "344", "335"]
            potansiyel_sadik = [
                "553", "551", "552", "541", "542", "533", "532", "531",
                "452", "451", "442", "441", "431", "453", "433", "432",
                "423", "353", "352", "351", "342", "341", "333", "323"
            ]
            yeni = ["512", "511", "422", "421", "412", "411", "311"]
            umut_verici = [
                "525", "524", "523", "522", "521", "515", "514", "513",
                "425", "424", "413", "414", "415", "315", "314", "313"
            ]
            dikkat = ["535", "534", "443", "434", "343", "334", "325", "324"]
            kaybedemezsin = ["155", "154", "144", "214", "215", "115", "114", "113"]
            uyumak_uzere = ["331", "321", "312", "221", "213"]
            risk_altinda = [
                "255", "254", "245", "244", "253", "252", "243", "242",
                "235", "234", "225", "224", "153", "152", "145", "143",
                "142", "135", "134", "133", "125", "124"
            ]
            kis_uykusu = [
                "332", "322", "231", "241", "251", "233", "232", "223",
                "222", "132", "123", "122", "212", "211"
            ]
            kayip = ["111", "112", "121", "131", "141", "151"]

            if skor in sampiyon:
                return "Şampiyon"
            elif skor in sadik:
                return "Sadık Müşteri"
            elif skor in potansiyel_sadik:
                return "Potansiyel Sadık"
            elif skor in yeni:
                return "Yeni Müşteri"
            elif skor in umut_verici:
                return "Umut Verici"
            elif skor in dikkat:
                return "Dikkat Gerekiyor"
            elif skor in kaybedemezsin:
                return "Onları Kaybedemezsin"
            elif skor in uyumak_uzere:
                return "Uyumak Üzere"
            elif skor in risk_altinda:
                return "Risk Altında"
            elif skor in kis_uykusu:
                return "Kış Uykusunda"
            elif skor in kayip:
                return "Kayıp"
            else:
                return "Diğer"

        rfm["segment"] = rfm["rfm_skor"].apply(segment_belirle)

        cursor.execute("DELETE FROM rfm_skorlari")

        for musteri_id, row in rfm.iterrows():
            cursor.execute("""
                INSERT INTO rfm_skorlari
                (
                    musteri_id,
                    son_alisveris_gunu,
                    alisveris_sikligi,
                    harcama_tutari,
                    rfm_skor,
                    segment,
                    hesaplama_tarihi
                )
                VALUES (%s, %s, %s, %s, %s, %s, NOW())
            """, (
                int(musteri_id),
                int(row["recency"]),
                int(row["frequency"]),
                float(row["monetary"]),
                str(row["rfm_skor"]),
                str(row["segment"])
            ))

        conn.commit()
        cursor.close()

        return {
            "message": "RFM analizi tamamlandı",
            "musteri_sayisi": len(rfm),
            "date_mode": date_mode,
            "finance_mode": finance_mode,
            "referans_tarihi": str(referans_tarihi.date()),
            "hedef_tufe": hedef_tufe
        }

    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        if conn and conn.is_connected():
            conn.close()

#========================================================
#LTV ANALİZ
#========================================================
@app.post("/analytics/ltv/run")
def run_ltv(
    current_user: dict = Depends(require_permission("analytics.run_ltv"))
):
    conn = None

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT 
                musteri_id,
                alisveris_sikligi,
                harcama_tutari,
                son_alisveris_gunu,
                segment
            FROM rfm_skorlari
        """)

        rows = cursor.fetchall()

        if not rows:
            return {
                "message": "LTV için önce /analytics/rfm/run çalıştırılmalı.",
                "musteri_sayisi": 0
            }

        df = pd.DataFrame(rows)

        df["alisveris_sikligi"] = pd.to_numeric(df["alisveris_sikligi"], errors="coerce").fillna(0)
        df["harcama_tutari"] = pd.to_numeric(df["harcama_tutari"], errors="coerce").fillna(0)
        df["son_alisveris_gunu"] = pd.to_numeric(df["son_alisveris_gunu"], errors="coerce").fillna(0)

        df["guvenli_alisveris_sikligi"] = df["alisveris_sikligi"].replace(0, 1)

        df["ortalama_siparis_tutari"] = (
            df["harcama_tutari"] / df["guvenli_alisveris_sikligi"]
        )

        # En doğru mevcut LTV:
        # RFM tablosundaki harcama_tutari zaten müşterinin bugüne kadar yaptığı toplam harcamadır.
        # Bu yüzden mevcut müşteri yaşam değeri = toplam harcama olarak alınır.
        df["ltv"] = df["harcama_tutari"]

        def churn_olasiligi_hesapla(row):
            recency = float(row["son_alisveris_gunu"])
            segment = row["segment"]

            if segment in ["Şampiyon", "Sadık Müşteri"]:
                base = 20
            elif segment in ["Potansiyel Sadık", "Yeni Müşteri", "Umut Verici"]:
                base = 35
            elif segment in ["Dikkat Gerekiyor"]:
                base = 55
            elif segment in ["Risk Altında", "Uyumak Üzere", "Onları Kaybedemezsin"]:
                base = 75
            elif segment in ["Kış Uykusunda", "Kayıp"]:
                base = 85
            else:
                base = 60

            if recency >= 720:
                base += 10
            elif recency >= 365:
                base += 5
            elif recency <= 90:
                base -= 10

            return max(0, min(100, round(base, 2)))

        df["churn_olasiligi"] = df.apply(churn_olasiligi_hesapla, axis=1)

        def risk_seviyesi_belirle(churn):
            if churn >= 70:
                return "Yüksek Risk"
            elif churn >= 40:
                return "Orta Risk"
            return "Düşük Risk"

        df["risk_seviyesi"] = df["churn_olasiligi"].apply(risk_seviyesi_belirle)

        for _, row in df.iterrows():
            cursor.execute("""
                INSERT INTO ltv_tahminleri
                (
                    musteri_id,
                    musteri_yasam_degeri,
                    churn_olasiligi,
                    risk_seviyesi,
                    hesaplama_tarihi
                )
                VALUES (%s, %s, %s, %s, NOW())
                ON DUPLICATE KEY UPDATE
                    musteri_yasam_degeri = VALUES(musteri_yasam_degeri),
                    churn_olasiligi = VALUES(churn_olasiligi),
                    risk_seviyesi = VALUES(risk_seviyesi),
                    hesaplama_tarihi = NOW()
            """, (
                int(row["musteri_id"]),
                float(row["ltv"]),
                float(row["churn_olasiligi"]),
                str(row["risk_seviyesi"])
            ))

        conn.commit()
        cursor.close()

        return {
            "message": "LTV analizi tamamlandı",
            "musteri_sayisi": len(df),
            "ortalama_ltv": round(float(df["ltv"].mean()), 2),
            "toplam_ltv": round(float(df["ltv"].sum()), 2),
            "ortalama_siparis_tutari": round(float(df["ortalama_siparis_tutari"].mean()), 2)
        }

    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        if conn and conn.is_connected():
            conn.close()


#========================================================
#CHURN
#========================================================
@app.post("/analytics/churn/run")
def run_churn(
    current_user: dict = Depends(require_permission("analytics.run_churn"))
):
    conn = None

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                musteri_id,
                siparis_tarihi,
                gercek_tutar
            FROM vw_siparis_gercek
            WHERE musteri_id IS NOT NULL
              AND siparis_tarihi IS NOT NULL
              AND gercek_tutar IS NOT NULL
        """)

        rows = cursor.fetchall()

        if not rows:
            return {"message": "Churn analizi için uygun sipariş verisi bulunamadı."}

        df = pd.DataFrame(rows)

        df["siparis_tarihi"] = pd.to_datetime(df["siparis_tarihi"])
        df["gercek_tutar"] = df["gercek_tutar"].astype(float)

        referans_tarihi = df["siparis_tarihi"].max()

        son_90_baslangic = referans_tarihi - pd.Timedelta(days=90)
        onceki_90_baslangic = referans_tarihi - pd.Timedelta(days=180)

        churn_listesi = []

        for musteri_id, grup in df.groupby("musteri_id"):
            son_siparis = grup["siparis_tarihi"].max()
            son_siparisten_gecen_gun = (referans_tarihi - son_siparis).days

            son_donem = grup[
                (grup["siparis_tarihi"] > son_90_baslangic) &
                (grup["siparis_tarihi"] <= referans_tarihi)
            ]

            onceki_donem = grup[
                (grup["siparis_tarihi"] > onceki_90_baslangic) &
                (grup["siparis_tarihi"] <= son_90_baslangic)
            ]

            son_frekans = len(son_donem)
            onceki_frekans = len(onceki_donem)

            son_aov = son_donem["gercek_tutar"].mean() if son_frekans > 0 else 0
            onceki_aov = onceki_donem["gercek_tutar"].mean() if onceki_frekans > 0 else 0

            
            recency_skor = min((son_siparisten_gecen_gun / 180) * 100, 100)

            
            if onceki_frekans > 0:
                frekans_dusus = max(0, (onceki_frekans - son_frekans) / onceki_frekans)
            else:
                frekans_dusus = 0 if son_frekans > 0 else 1

            frekans_skor = frekans_dusus * 100

            
            if onceki_aov > 0:
                aov_dusus = max(0, (onceki_aov - son_aov) / onceki_aov)
            else:
                aov_dusus = 0

            aov_skor = aov_dusus * 100

            
            churn_olasiligi = (
                recency_skor * 0.50 +
                frekans_skor * 0.30 +
                aov_skor * 0.20
            )

            churn_olasiligi = max(0, min(100, churn_olasiligi))

            if churn_olasiligi < 30:
                risk_seviyesi = "Düşük"
            elif churn_olasiligi < 65:
                risk_seviyesi = "Orta"
            else:
                risk_seviyesi = "Yüksek"

            churn_listesi.append({
                "musteri_id": int(musteri_id),
                "churn_olasiligi": float(churn_olasiligi),
                "risk_seviyesi": risk_seviyesi
            })

        for row in churn_listesi:
            cursor.execute("""
                INSERT INTO ltv_tahminleri
                (
                    musteri_id,
                    musteri_yasam_degeri,
                    churn_olasiligi,
                    risk_seviyesi,
                    hesaplama_tarihi
                )
                VALUES (%s, 0, %s, %s, NOW())
                ON DUPLICATE KEY UPDATE
                    churn_olasiligi = VALUES(churn_olasiligi),
                    risk_seviyesi = VALUES(risk_seviyesi),
                    hesaplama_tarihi = NOW()
            """, (
                row["musteri_id"],
                row["churn_olasiligi"],
                row["risk_seviyesi"]
            ))

        conn.commit()
        cursor.close()

        return {
            "message": "Churn analizi tamamlandı",
            "musteri_sayisi": len(churn_listesi)
        }

    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        if conn and conn.is_connected():
            conn.close()


# =========================================================
# MÜŞTERİ LİSTESİ SAYFASI BACKEND
# =========================================================

@app.get("/customers")
def get_customers(
    search: str | None = None,
    city: str | None = None,
    segment: str | None = None,
    risk: str | None = None,

    behavior_filter: str | None = None,

    r_min: int | None = None,
    r_max: int | None = None,
    f_min: int | None = None,
    f_max: int | None = None,
    m_min: int | None = None,
    m_max: int | None = None,
    rfm_score: str | None = None,

    min_spend: float | None = None,
    max_spend: float | None = None,
    min_real_spend: float | None = None,
    max_real_spend: float | None = None,
    min_avg_order: float | None = None,
    max_avg_order: float | None = None,
    min_orders: int | None = None,
    max_orders: int | None = None,

    sales_channel: str | None = None,
    last_store: str | None = None,

    return_filter: str | None = None,
    min_returns: int | None = None,
    max_returns: int | None = None,

    data_status: str | None = None,

    last_purchase_from: str | None = None,
    last_purchase_to: str | None = None,

    page: int = 1,
    page_size: int = 50,
    current_user: dict = Depends(require_permission("customers.view"))
):
    conn = None

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        page = max(page, 1)
        page_size = max(min(page_size, 100), 1)
        offset = (page - 1) * page_size

        filters = ["1 = 1"]
        params = []

        if search and search.strip():
            search_clean = search.strip()
            phone_search = (
                search_clean
                .replace(" ", "")
                .replace("-", "")
                .replace("(", "")
                .replace(")", "")
                .replace("+", "")
            )

            filters.append("""
                (
                    LOWER(code) LIKE %s
                    OR LOWER(name) LIKE %s
                    OR LOWER(email_raw) LIKE %s
                    OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(phone_raw, ''), ' ', ''), '-', ''), '(', ''), ')', ''), '+', '') LIKE %s
                )
            """)

            search_like = f"%{search_clean.lower()}%"
            phone_like = f"%{phone_search}%"

            params.extend([
                search_like,
                search_like,
                search_like,
                phone_like
            ])

        if city and city != "Tümü":
            filters.append("city = %s")
            params.append(city)

        if segment and segment != "Tümü":
            filters.append("segment = %s")
            params.append(segment)

        if risk and risk != "Tümü":
            filters.append("churnRisk = %s")
            params.append(risk)

        if behavior_filter:
            if behavior_filter == "last7":
                filters.append("lastPurchaseDate >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)")
            elif behavior_filter == "last15":
                filters.append("lastPurchaseDate >= DATE_SUB(CURDATE(), INTERVAL 15 DAY)")
            elif behavior_filter == "last30":
                filters.append("lastPurchaseDate >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)")
            elif behavior_filter == "inactive90":
                filters.append("""
                    (
                        lastPurchaseDate IS NULL
                        OR lastPurchaseDate < DATE_SUB(CURDATE(), INTERVAL 90 DAY)
                    )
                """)
            elif behavior_filter == "inactive180":
                filters.append("""
                    (
                        lastPurchaseDate IS NULL
                        OR lastPurchaseDate < DATE_SUB(CURDATE(), INTERVAL 180 DAY)
                    )
                """)

        if r_min is not None:
            filters.append("r_score >= %s")
            params.append(r_min)

        if r_max is not None:
            filters.append("r_score <= %s")
            params.append(r_max)

        if f_min is not None:
            filters.append("f_score >= %s")
            params.append(f_min)

        if f_max is not None:
            filters.append("f_score <= %s")
            params.append(f_max)

        if m_min is not None:
            filters.append("m_score >= %s")
            params.append(m_min)

        if m_max is not None:
            filters.append("m_score <= %s")
            params.append(m_max)

        if rfm_score and rfm_score.strip():
            filters.append("rfm = %s")
            params.append(rfm_score.strip())

        if min_spend is not None:
            filters.append("totalSpend >= %s")
            params.append(min_spend)

        if max_spend is not None:
            filters.append("totalSpend <= %s")
            params.append(max_spend)

        if min_real_spend is not None:
            filters.append("realSpend >= %s")
            params.append(min_real_spend)

        if max_real_spend is not None:
            filters.append("realSpend <= %s")
            params.append(max_real_spend)

        if min_avg_order is not None:
            filters.append("avgOrderSpend >= %s")
            params.append(min_avg_order)

        if max_avg_order is not None:
            filters.append("avgOrderSpend <= %s")
            params.append(max_avg_order)

        if min_orders is not None:
            filters.append("orderCount >= %s")
            params.append(min_orders)

        if max_orders is not None:
            filters.append("orderCount <= %s")
            params.append(max_orders)

        if sales_channel and sales_channel != "Tümü":
            filters.append("lastChannel = %s")
            params.append(sales_channel)

        if last_store and last_store.strip():
            filters.append("LOWER(lastStore) LIKE %s")
            params.append(f"%{last_store.strip().lower()}%")

        if return_filter:
            if return_filter == "has_returns":
                filters.append("returnCount > 0")
            elif return_filter == "high_return_rate":
                filters.append("returnRate >= 20")

        if min_returns is not None:
            filters.append("returnCount >= %s")
            params.append(min_returns)

        if max_returns is not None:
            filters.append("returnCount <= %s")
            params.append(max_returns)

        if data_status:
            if data_status == "has_phone":
                filters.append("phone_raw IS NOT NULL AND phone_raw <> ''")
            elif data_status == "has_email":
                filters.append("email_raw IS NOT NULL AND email_raw <> ''")
            elif data_status == "missing_contact":
                filters.append("""
                    (
                        phone_raw IS NULL OR phone_raw = ''
                        OR email_raw IS NULL OR email_raw = ''
                    )
                """)
            elif data_status == "no_segment":
                filters.append("segment = 'Segmentsiz'")

        if last_purchase_from:
            filters.append("lastPurchaseDate >= %s")
            params.append(last_purchase_from)

        if last_purchase_to:
            filters.append("lastPurchaseDate <= %s")
            params.append(last_purchase_to)

        filter_sql = " AND ".join(filters)

        query = f"""
            WITH latest_rfm AS (
                SELECT *
                FROM (
                    SELECT
                        r.*,
                        ROW_NUMBER() OVER (
                            PARTITION BY r.musteri_id
                            ORDER BY r.hesaplama_tarihi DESC
                        ) AS rn
                    FROM rfm_skorlari r
                ) x
                WHERE x.rn = 1
            ),

            latest_ltv AS (
                SELECT *
                FROM (
                    SELECT
                        l.*,
                        ROW_NUMBER() OVER (
                            PARTITION BY l.musteri_id
                            ORDER BY l.hesaplama_tarihi DESC
                        ) AS rn
                    FROM ltv_tahminleri l
                ) x
                WHERE x.rn = 1
            ),

            hedef_tufe AS (
                SELECT kumulatif_katsayi AS hedef
                FROM enflasyon_endeksi
                ORDER BY yil DESC, ay DESC
                LIMIT 1
            ),

            order_totals AS (
                SELECT
                    s.musteri_id,

                    COUNT(DISTINCT s.siparis_id) AS orderCount,

                    SUM(
                        CASE
                            WHEN COALESCE(s.belge_turu_id, 1) = 1
                            THEN COALESCE(su.adet, 0) * COALESCE(su.birim_fiyat, 0)
                            ELSE 0
                        END
                    ) AS totalSpend,

                    SUM(
                        CASE
                            WHEN COALESCE(s.belge_turu_id, 1) = 1
                            THEN
                                CASE
                                    WHEN e.kumulatif_katsayi IS NOT NULL
                                     AND ht.hedef IS NOT NULL
                                     AND e.kumulatif_katsayi > 0
                                    THEN
                                        (COALESCE(su.adet, 0) * COALESCE(su.birim_fiyat, 0))
                                        * (ht.hedef / e.kumulatif_katsayi)
                                    ELSE
                                        COALESCE(su.adet, 0) * COALESCE(su.birim_fiyat, 0)
                                END
                            ELSE 0
                        END
                    ) AS realSpend,

                    MAX(s.siparis_tarihi) AS lastPurchaseDate

                FROM siparisler s
                LEFT JOIN siparis_urunleri su
                    ON su.siparis_id = s.siparis_id
                LEFT JOIN enflasyon_endeksi e
                    ON YEAR(s.siparis_tarihi) = e.yil
                   AND MONTH(s.siparis_tarihi) = e.ay
                LEFT JOIN hedef_tufe ht
                    ON 1 = 1
                WHERE s.musteri_id IS NOT NULL
                GROUP BY s.musteri_id
            ),

            latest_order AS (
                SELECT *
                FROM (
                    SELECT
                        s.siparis_id,
                        s.musteri_id,
                        s.siparis_tarihi,
                        s.sube_id,
                        s.satis_tipi_id,
                        ROW_NUMBER() OVER (
                            PARTITION BY s.musteri_id
                            ORDER BY s.siparis_tarihi DESC, s.siparis_id DESC
                        ) AS rn
                    FROM siparisler s
                    WHERE s.musteri_id IS NOT NULL
                      AND s.siparis_tarihi IS NOT NULL
                ) x
                WHERE x.rn = 1
            ),

            return_totals AS (
                SELECT
                    s.musteri_id,
                    COUNT(DISTINCT i.iade_id) AS returnCount,
                    COALESCE(SUM(i.iade_tutari), 0) AS returnAmount
                FROM iadeler i
                INNER JOIN siparisler s
                    ON s.siparis_id = i.siparis_id
                GROUP BY s.musteri_id
            ),

            enriched_customers AS (
                SELECT
                    m.musteri_id AS id,
                    COALESCE(m.musteri_kodu, CONCAT('ID-', m.musteri_id)) AS code,

                    TRIM(CONCAT(
                        COALESCE(m.musteri_adi, ''),
                        ' ',
                        COALESCE(m.musteri_soyadi, '')
                    )) AS name,

                    m.eposta AS email_raw,
                    m.telefon AS phone_raw,

                    COALESCE(se.sehir_adi, 'Bilinmeyen') AS city,

                    COALESCE(r.segment, 'Segmentsiz') AS segment,

                    COALESCE(ot.totalSpend, 0) AS totalSpend,
                    COALESCE(ot.realSpend, 0) AS realSpend,

                    CASE
                        WHEN COALESCE(ot.orderCount, 0) > 0
                        THEN ROUND(COALESCE(ot.totalSpend, 0) / ot.orderCount, 2)
                        ELSE 0
                    END AS avgOrderSpend,

                    COALESCE(ot.orderCount, 0) AS orderCount,

                    COALESCE(r.rfm_skor, '-') AS rfm,

                    CAST(SUBSTRING(
                        CASE
                            WHEN COALESCE(r.rfm_skor, '') REGEXP '^[0-9]{{3}}$'
                            THEN r.rfm_skor
                            ELSE '000'
                        END, 1, 1
                    ) AS UNSIGNED) AS r_score,

                    CAST(SUBSTRING(
                        CASE
                            WHEN COALESCE(r.rfm_skor, '') REGEXP '^[0-9]{{3}}$'
                            THEN r.rfm_skor
                            ELSE '000'
                        END, 2, 1
                    ) AS UNSIGNED) AS f_score,

                    CAST(SUBSTRING(
                        CASE
                            WHEN COALESCE(r.rfm_skor, '') REGEXP '^[0-9]{{3}}$'
                            THEN r.rfm_skor
                            ELSE '000'
                        END, 3, 1
                    ) AS UNSIGNED) AS m_score,

                    COALESCE(r.son_alisveris_gunu, 0) AS lastPurchaseDays,

                    ot.lastPurchaseDate AS lastPurchaseDate,
                    DATE_FORMAT(ot.lastPurchaseDate, '%Y-%m-%d') AS lastPurchase,

                    CASE
                        WHEN LOWER(COALESCE(st.satis_tipi_adi, '')) LIKE '%online%' THEN 'Online'
                        WHEN LOWER(COALESCE(sb.sube_adi, '')) LIKE '%online%' THEN 'Online'
                        WHEN sb.sube_adi IS NOT NULL THEN sb.sube_adi
                        ELSE 'Bilinmeyen'
                    END AS lastStore,

                    CASE
                        WHEN LOWER(COALESCE(st.satis_tipi_adi, '')) LIKE '%online%' THEN 'Online'
                        WHEN LOWER(COALESCE(sb.sube_adi, '')) LIKE '%online%' THEN 'Online'
                        ELSE 'Mağaza'
                    END AS lastChannel,

                    COALESCE(rt.returnCount, 0) AS returnCount,
                    COALESCE(rt.returnAmount, 0) AS returnAmount,

                    CASE
                        WHEN COALESCE(ot.totalSpend, 0) > 0
                        THEN ROUND((COALESCE(rt.returnAmount, 0) / ot.totalSpend) * 100, 2)
                        ELSE 0
                    END AS returnRate,

                    CASE
                        WHEN COALESCE(l.risk_seviyesi, '') LIKE '%Yüksek%' THEN 'Yüksek'
                        WHEN COALESCE(l.risk_seviyesi, '') LIKE '%Orta%' THEN 'Orta'
                        WHEN COALESCE(l.risk_seviyesi, '') LIKE '%Düşük%' THEN 'Düşük'
                        WHEN COALESCE(l.churn_olasiligi, 0) >= 70 THEN 'Yüksek'
                        WHEN COALESCE(l.churn_olasiligi, 0) >= 40 THEN 'Orta'
                        ELSE 'Düşük'
                    END AS churnRisk

                FROM musteriler m

                LEFT JOIN latest_rfm r
                    ON r.musteri_id = m.musteri_id

                LEFT JOIN latest_ltv l
                    ON l.musteri_id = m.musteri_id

                LEFT JOIN order_totals ot
                    ON ot.musteri_id = m.musteri_id

                LEFT JOIN latest_order lo
                    ON lo.musteri_id = m.musteri_id

                LEFT JOIN subeler sb
                    ON sb.sube_id = lo.sube_id

                LEFT JOIN sehirler se
                    ON se.sehir_id = sb.sehir_id

                LEFT JOIN satis_tipleri st
                    ON st.satis_tipi_id = lo.satis_tipi_id

                LEFT JOIN return_totals rt
                    ON rt.musteri_id = m.musteri_id
            ),

            filtered_customers AS (
                SELECT *
                FROM enriched_customers
                WHERE {filter_sql}
            )

            SELECT
                *,
                COUNT(*) OVER() AS total_count,

                SUM(
                    CASE
                        WHEN orderCount >= 2
                        THEN 1 ELSE 0
                    END
                ) OVER() AS repeat_customers,

                SUM(
                    CASE
                        WHEN churnRisk = 'Yüksek'
                        THEN 1 ELSE 0
                    END
                ) OVER() AS risky_customers,

                AVG(totalSpend) OVER() AS avg_spend,

                SUM(totalSpend) OVER() / NULLIF(SUM(orderCount) OVER(), 0) AS avg_order_value

            FROM filtered_customers
            ORDER BY totalSpend DESC
            LIMIT %s OFFSET %s
        """

        cursor.execute(query, params + [page_size, offset])
        rows = cursor.fetchall()

        if rows:
            total = int(rows[0].get("total_count") or 0)
            repeat_customers = int(rows[0].get("repeat_customers") or 0)
            risky_customers = int(rows[0].get("risky_customers") or 0)
            avg_spend = round(float(rows[0].get("avg_spend") or 0), 2)
            avg_order_value = round(float(rows[0].get("avg_order_value") or 0), 2)
        else:
            total = 0
            repeat_customers = 0
            risky_customers = 0
            avg_spend = 0
            avg_order_value = 0

        repeat_purchase_rate = round(
            (repeat_customers / total) * 100,
            1
        ) if total > 0 else 0

        items = []

        for row in rows:
            row = dict(row)

            row.pop("total_count", None)
            row.pop("repeat_customers", None)
            row.pop("risky_customers", None)
            row.pop("avg_spend", None)
            row.pop("avg_order_value", None)

            row["email"] = mask_email(row.get("email_raw"))
            row["phone"] = mask_phone(row.get("phone_raw"))

            row.pop("email_raw", None)
            row.pop("phone_raw", None)
            row.pop("lastPurchaseDate", None)

            items.append(row)

        total_pages = max((total + page_size - 1) // page_size, 1)

        cursor.close()

        return {
    "items": items,
    "total": total,
    "total_pages": total_pages,
    "page": page,
    "page_size": page_size,
    "kpis": {
        "total_customers": total,
        "repeat_purchase_rate": repeat_purchase_rate,
        "risky_customers": risky_customers,
        "avg_spend": avg_spend,
        "avg_order_value": avg_order_value,
    }
}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        if conn and conn.is_connected():
            conn.close()


@app.get("/customers/export")
def export_customers(
    search: str | None = None,
    city: str | None = None,
    segment: str | None = None,
    risk: str | None = None,
    current_user: dict = Depends(require_permission("customers.export"))
):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        query = """
            SELECT
                m.musteri_kodu AS 'Müşteri Kodu',
                CONCAT(COALESCE(m.musteri_adi, ''), ' ', COALESCE(m.musteri_soyadi, '')) AS 'Ad Soyad',
                m.eposta AS 'E-posta',
                m.telefon AS 'Telefon',
                COALESCE(se.sehir_adi, 'Bilinmeyen') AS 'Şehir',
                COALESCE(r.segment, 'Segmentsiz') AS 'Segment',
                COALESCE(r.rfm_skor, '-') AS 'RFM Skoru',
                SUBSTRING(LPAD(COALESCE(r.rfm_skor, '000'), 3, '0'), 1, 1) AS 'R',
                SUBSTRING(LPAD(COALESCE(r.rfm_skor, '000'), 3, '0'), 2, 1) AS 'F',
                SUBSTRING(LPAD(COALESCE(r.rfm_skor, '000'), 3, '0'), 3, 1) AS 'M',
                COALESCE(r.harcama_tutari, 0) AS 'Toplam Harcama',
                COALESCE(r.alisveris_sikligi, 0) AS 'Toplam Sipariş',
                COALESCE(r.son_alisveris_gunu, 0) AS 'Son Alışveriş Gün',
                DATE_FORMAT(lo.siparis_tarihi, '%Y-%m-%d') AS 'Son Alışveriş Tarihi',
                CASE
                    WHEN LOWER(COALESCE(st.satis_tipi_adi, '')) LIKE '%online%' THEN 'Online'
                    WHEN LOWER(COALESCE(sb.sube_adi, '')) LIKE '%online%' THEN 'Online'
                    WHEN sb.sube_adi IS NOT NULL THEN sb.sube_adi
                    ELSE 'Bilinmeyen'
                END AS 'Son Alışveriş Yeri',
                CASE
                    WHEN LOWER(COALESCE(st.satis_tipi_adi, '')) LIKE '%online%' THEN 'Online'
                    ELSE 'Mağaza'
                END AS 'Kanal',
                COALESCE(iade.return_count, 0) AS 'İade Sayısı',
                COALESCE(iade.return_amount, 0) AS 'İade Tutarı',
                CASE
                    WHEN COALESCE(l.risk_seviyesi, '') LIKE '%Yüksek%' THEN 'Yüksek'
                    WHEN COALESCE(l.risk_seviyesi, '') LIKE '%Orta%' THEN 'Orta'
                    WHEN COALESCE(l.churn_olasiligi, 0) >= 70 THEN 'Yüksek'
                    WHEN COALESCE(l.churn_olasiligi, 0) >= 40 THEN 'Orta'
                    ELSE 'Düşük'
                END AS 'Risk Durumu'
            FROM musteriler m
            LEFT JOIN rfm_skorlari r ON r.musteri_id = m.musteri_id
            LEFT JOIN ltv_tahminleri l ON l.musteri_id = m.musteri_id

            LEFT JOIN (
                SELECT *
                FROM (
                    SELECT
                        s.*,
                        ROW_NUMBER() OVER (
                            PARTITION BY s.musteri_id
                            ORDER BY s.siparis_tarihi DESC, s.siparis_id DESC
                        ) AS rn
                    FROM siparisler s
                ) x
                WHERE x.rn = 1
            ) lo ON lo.musteri_id = m.musteri_id

            LEFT JOIN subeler sb ON sb.sube_id = lo.sube_id
            LEFT JOIN sehirler se ON se.sehir_id = sb.sehir_id
            LEFT JOIN satis_tipleri st ON st.satis_tipi_id = lo.satis_tipi_id

            LEFT JOIN (
                SELECT
                    s.musteri_id,
                    COUNT(DISTINCT i.iade_id) AS return_count,
                    COALESCE(SUM(i.iade_tutari), 0) AS return_amount
                FROM iadeler i
                INNER JOIN siparisler s ON s.siparis_id = i.siparis_id
                GROUP BY s.musteri_id
            ) iade ON iade.musteri_id = m.musteri_id

            WHERE 1 = 1
        """

        params = []

        if search and search.strip():
            query += """
                AND (
                    LOWER(m.musteri_kodu) LIKE %s
                    OR LOWER(m.musteri_adi) LIKE %s
                    OR LOWER(m.musteri_soyadi) LIKE %s
                    OR LOWER(m.eposta) LIKE %s
                    OR m.telefon LIKE %s
                )
            """
            like = f"%{search.strip().lower()}%"
            params.extend([like, like, like, like, like])

        if city and city != "Tümü":
            query += " AND se.sehir_adi = %s"
            params.append(city)

        if segment and segment != "Tümü":
            query += " AND r.segment = %s"
            params.append(segment)

        cursor.execute(query, params)
        rows = cursor.fetchall()

        df = pd.DataFrame(rows)

        output = io.BytesIO()

        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="Müşteri Listesi")

        output.seek(0)

        filename = f"musteri_listesi_{datetime.now().strftime('%Y%m%d_%H%M')}.xlsx"

        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )

    finally:
        cursor.close()
        conn.close()




@app.get("/customers/filters")
def get_customer_filters(
    current_user: dict = Depends(require_permission("customers.view"))
):
    cached = get_cache("customers_filters", ttl_seconds=600)

    if cached:
        return cached

    conn = None

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT DISTINCT s.sehir_adi AS city
            FROM musteriler m
            LEFT JOIN siparisler sp ON sp.musteri_id = m.musteri_id
            LEFT JOIN subeler sb ON sb.sube_id = sp.sube_id
            LEFT JOIN sehirler s ON s.sehir_id = sb.sehir_id
            WHERE s.sehir_adi IS NOT NULL
            ORDER BY s.sehir_adi
        """)

        cities = [
            row["city"]
            for row in cursor.fetchall()
            if row["city"]
        ]

        cursor.execute("""
            SELECT DISTINCT segment
            FROM rfm_skorlari
            WHERE segment IS NOT NULL AND segment <> ''
            ORDER BY segment
        """)

        segments = [
            row["segment"]
            for row in cursor.fetchall()
            if row["segment"]
        ]

        result = {
            "cities": ["Tümü"] + cities,
            "segments": ["Tümü"] + segments
        }

        set_cache("customers_filters", result)

        cursor.close()

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        if conn and conn.is_connected():
            conn.close()



@app.get("/customers/summary")
def get_customers_summary(
    current_user: dict = Depends(require_permission("customers.view"))
):
    conn = None

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT COUNT(*) AS total_customers
            FROM musteriler
        """)
        total_customers = cursor.fetchone()["total_customers"]

        cursor.execute("""
            SELECT COUNT(*) AS vip_customers
            FROM rfm_skorlari
            WHERE segment IN ('Şampiyon', 'Sadık Müşteri', 'VIP')
        """)
        vip_customers = cursor.fetchone()["vip_customers"]

        cursor.execute("""
            SELECT COUNT(*) AS risky_customers
            FROM ltv_tahminleri
            WHERE risk_seviyesi = 'Yüksek'
        """)
        risky_customers = cursor.fetchone()["risky_customers"]

        cursor.execute("""
            SELECT ROUND(COALESCE(AVG(musteri_yasam_degeri), 0), 2) AS avg_ltv
            FROM ltv_tahminleri
        """)
        avg_ltv = cursor.fetchone()["avg_ltv"]

        cursor.execute("""
            SELECT COUNT(*) AS new_customers
            FROM musteriler
            WHERE olusturma_tarihi >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        """)
        new_customers = cursor.fetchone()["new_customers"]

        cursor.close()

        return {
            "total_customers": total_customers,
            "vip_customers": vip_customers,
            "risky_customers": risky_customers,
            "avg_ltv": avg_ltv,
            "new_customers": new_customers
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Müşteri özet hatası: {str(e)}")

    finally:
        if conn and conn.is_connected():
            conn.close()




#========================================================
#MÜŞTERİ İD
#========================================================
@app.get("/customers/{musteri_id}")
def get_customer_detail(
    musteri_id: int,
    current_user: dict = Depends(require_permission("customers.detail"))
):
    conn = None

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

       
        cursor.execute("""
            SELECT
                m.musteri_id,
                m.musteri_kodu,
                m.musteri_adi,
                m.musteri_soyadi,
                m.eposta,
                m.telefon,
                m.olusturma_tarihi,

                r.son_alisveris_gunu,
                r.alisveris_sikligi,
                r.harcama_tutari,
                r.rfm_skor,
                r.segment,
                r.hesaplama_tarihi AS rfm_hesaplama_tarihi,

                l.musteri_yasam_degeri,
                l.churn_olasiligi,
                l.risk_seviyesi,
                l.hesaplama_tarihi AS ltv_churn_hesaplama_tarihi

            FROM musteriler m
            LEFT JOIN rfm_skorlari r 
                ON m.musteri_id = r.musteri_id
            LEFT JOIN ltv_tahminleri l 
                ON m.musteri_id = l.musteri_id
            WHERE m.musteri_id = %s
        """, (musteri_id,))

        customer = cursor.fetchone()

        if not customer:
            raise HTTPException(status_code=404, detail="Müşteri bulunamadı.")
        
        if "customers.view_sensitive" not in current_user["permissions"]:
            customer = mask_customer_row(customer)

        
        cursor.execute("""
            SELECT
                COUNT(*) AS toplam_siparis_sayisi,
                COALESCE(SUM(gercek_tutar), 0) AS toplam_ciro,
                COALESCE(AVG(gercek_tutar), 0) AS ortalama_siparis_tutari,
                MIN(siparis_tarihi) AS ilk_siparis_tarihi,
                MAX(siparis_tarihi) AS son_siparis_tarihi
            FROM vw_siparis_gercek
            WHERE musteri_id = %s
        """, (musteri_id,))

        order_summary = cursor.fetchone()

        
        cursor.execute("""
            SELECT
                siparis_id,
                fatura_no,
                belge_turu,
                satis_lokasyonu,
                siparis_tarihi,
                gercek_tutar,
                siparis_detayi
            FROM vw_siparis_gercek
            WHERE musteri_id = %s
            ORDER BY siparis_tarihi DESC
            LIMIT 10
        """, (musteri_id,))

        recent_orders = cursor.fetchall()

        
        cursor.execute("""
            SELECT
                YEAR(siparis_tarihi) AS yil,
                MONTH(siparis_tarihi) AS ay,
                COUNT(*) AS siparis_sayisi,
                COALESCE(SUM(gercek_tutar), 0) AS toplam_tutar
            FROM vw_siparis_gercek
            WHERE musteri_id = %s
            GROUP BY YEAR(siparis_tarihi), MONTH(siparis_tarihi)
            ORDER BY yil, ay
        """, (musteri_id,))

        monthly_trend = cursor.fetchall()

        
        segment = customer.get("segment")
        risk = customer.get("risk_seviyesi")
        churn = customer.get("churn_olasiligi") or 0

        if risk == "Yüksek":
            recommendation = "Müşteri kayıp riski taşıyor. Geri kazanım kampanyası veya özel indirim önerilir."
        elif segment == "Şampiyon":
            recommendation = "Yüksek değerli müşteri. Sadakat programı, VIP kampanya veya özel teklif önerilir."
        elif segment == "Risk Altında":
            recommendation = "Müşteri daha önce değerli alışverişler yapmış ancak uzaklaşma eğiliminde. Yeniden aktivasyon önerilir."
        elif churn >= 60:
            recommendation = "Churn riski yükseliyor. Kişiselleştirilmiş iletişim önerilir."
        else:
            recommendation = "Müşteri davranışı stabil görünüyor. Segmentine uygun kampanya önerilebilir."

        cursor.close()

        return {
            "customer": customer,
            "order_summary": order_summary,
            "recent_orders": recent_orders,
            "monthly_trend": monthly_trend,
            "smart_recommendation": recommendation
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Müşteri detay hatası: {str(e)}"
        )

    finally:
        if conn and conn.is_connected():
            conn.close()


#========================================================
#SEGMENTLER
#========================================================
@app.get("/segments")
def get_segments(
    current_user: dict = Depends(require_permission("analytics.read"))
):
    conn = None
    cursor = None

    try:
        cached = get_cache("segments_summary", ttl_seconds=300)
        if cached:
            return cached

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                r.segment,
                COUNT(DISTINCT r.musteri_id) AS musteri_sayisi,
                ROUND(COALESCE(SUM(r.harcama_tutari), 0), 2) AS toplam_harcama,
                ROUND(COALESCE(AVG(r.harcama_tutari), 0), 2) AS ortalama_harcama,
                ROUND(COALESCE(AVG(r.alisveris_sikligi), 0), 2) AS ortalama_alisveris_sikligi,
                ROUND(COALESCE(AVG(r.son_alisveris_gunu), 0), 2) AS ortalama_son_alisveris_gunu,
                ROUND(COALESCE(AVG(l.musteri_yasam_degeri), 0), 2) AS ortalama_ltv,
                ROUND(COALESCE(AVG(l.churn_olasiligi), 0), 2) AS ortalama_churn_riski,
                SUM(CASE WHEN l.risk_seviyesi = 'Düşük' THEN 1 ELSE 0 END) AS dusuk_riskli_musteri,
                SUM(CASE WHEN l.risk_seviyesi = 'Orta' THEN 1 ELSE 0 END) AS orta_riskli_musteri,
                SUM(CASE WHEN l.risk_seviyesi = 'Yüksek' THEN 1 ELSE 0 END) AS yuksek_riskli_musteri
            FROM rfm_skorlari r FORCE INDEX (idx_rfm_segment)
            LEFT JOIN (
                SELECT
                    musteri_id,
                    MAX(musteri_yasam_degeri) AS musteri_yasam_degeri,
                    MAX(churn_olasiligi) AS churn_olasiligi,
                    MAX(risk_seviyesi) AS risk_seviyesi
                FROM ltv_tahminleri
                GROUP BY musteri_id
            ) l ON l.musteri_id = r.musteri_id
            WHERE r.segment IS NOT NULL
            GROUP BY r.segment
            ORDER BY musteri_sayisi DESC
        """)

        segments = cursor.fetchall()

        cursor.execute("""
            SELECT COUNT(DISTINCT musteri_id) AS toplam_musteri
            FROM rfm_skorlari
        """)

        total_row = cursor.fetchone()
        toplam_musteri = total_row["toplam_musteri"] if total_row else 0

        for segment in segments:
            segment["oran_yuzde"] = round(
                (segment["musteri_sayisi"] / toplam_musteri) * 100,
                2
            ) if toplam_musteri else 0

        result = {
            "toplam_segment_sayisi": len(segments),
            "toplam_musteri": toplam_musteri,
            "segments": segments
        }

        set_cache("segments_summary", result)

        return result

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Segment listesi hatası: {str(e)}"
        )

    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()


#================================================
# SEGMENT MÜŞTERİ 
#================================================
@app.get("/segments/{segment}/customers")
def get_customers_by_segment(
    segment: str,
    page: int = 1,
    page_size: int = 20,
    risk_seviyesi: Optional[str] = None,
    min_ltv: Optional[float] = None,
    max_ltv: Optional[float] = None,
    min_harcama: Optional[float] = None,
    max_harcama: Optional[float] = None,
    current_user: dict = Depends(require_permission("customers.read"))
):
    conn = None

    try:
        if page < 1:
            page = 1

        if page_size < 1:
            page_size = 20

        if page_size > 100:
            page_size = 100

        offset = (page - 1) * page_size

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        where_clauses = ["r.segment = %s"]
        params = [segment]

        if risk_seviyesi:
            where_clauses.append("l.risk_seviyesi = %s")
            params.append(risk_seviyesi)

        if min_ltv is not None:
            where_clauses.append("l.musteri_yasam_degeri >= %s")
            params.append(min_ltv)

        if max_ltv is not None:
            where_clauses.append("l.musteri_yasam_degeri <= %s")
            params.append(max_ltv)

        if min_harcama is not None:
            where_clauses.append("r.harcama_tutari >= %s")
            params.append(min_harcama)

        if max_harcama is not None:
            where_clauses.append("r.harcama_tutari <= %s")
            params.append(max_harcama)

        where_sql = "WHERE " + " AND ".join(where_clauses)

        count_sql = f"""
            SELECT COUNT(*) AS total
            FROM rfm_skorlari r
            JOIN musteriler m 
                ON r.musteri_id = m.musteri_id
            LEFT JOIN ltv_tahminleri l 
                ON r.musteri_id = l.musteri_id
            {where_sql}
        """

        cursor.execute(count_sql, params)
        total = cursor.fetchone()["total"]

        data_sql = f"""
            SELECT
                m.musteri_id,
                m.musteri_kodu,
                m.musteri_adi,
                m.musteri_soyadi,
                m.eposta,
                m.telefon,

                r.rfm_skor,
                r.segment,
                r.son_alisveris_gunu,
                r.alisveris_sikligi,
                r.harcama_tutari,

                l.musteri_yasam_degeri,
                l.churn_olasiligi,
                l.risk_seviyesi,

                r.hesaplama_tarihi AS rfm_hesaplama_tarihi,
                l.hesaplama_tarihi AS ltv_churn_hesaplama_tarihi

            FROM rfm_skorlari r
            JOIN musteriler m 
                ON r.musteri_id = m.musteri_id
            LEFT JOIN ltv_tahminleri l 
                ON r.musteri_id = l.musteri_id
            {where_sql}
            ORDER BY 
                l.churn_olasiligi DESC,
                r.harcama_tutari DESC,
                m.musteri_id ASC
            LIMIT %s OFFSET %s
        """

        data_params = params + [page_size, offset]

        cursor.execute(data_sql, data_params)
        customers = cursor.fetchall()
        customers = [mask_customer_row(row) for row in customers]

        cursor.execute("""
            SELECT
                COUNT(*) AS segment_musteri_sayisi,
                ROUND(COALESCE(SUM(r.harcama_tutari), 0), 2) AS segment_toplam_harcama,
                ROUND(COALESCE(AVG(r.harcama_tutari), 0), 2) AS segment_ortalama_harcama,
                ROUND(COALESCE(AVG(l.musteri_yasam_degeri), 0), 2) AS segment_ortalama_ltv,
                ROUND(COALESCE(AVG(l.churn_olasiligi), 0), 2) AS segment_ortalama_churn,
                SUM(CASE WHEN l.risk_seviyesi = 'Düşük' THEN 1 ELSE 0 END) AS dusuk_riskli_musteri,
                SUM(CASE WHEN l.risk_seviyesi = 'Orta' THEN 1 ELSE 0 END) AS orta_riskli_musteri,
                SUM(CASE WHEN l.risk_seviyesi = 'Yüksek' THEN 1 ELSE 0 END) AS yuksek_riskli_musteri
            FROM rfm_skorlari r
            LEFT JOIN ltv_tahminleri l 
                ON r.musteri_id = l.musteri_id
            WHERE r.segment = %s
        """, (segment,))

        summary = cursor.fetchone()

        cursor.close()

        total_pages = (total + page_size - 1) // page_size

        return {
            "segment": segment,
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": total_pages,
            "summary": summary,
            "items": customers
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Segment müşterileri hatası: {str(e)}"
        )

    finally:
        if conn and conn.is_connected():
            conn.close()



#====================================
# DASHBOARD SUMMARY
#====================================
@app.get("/dashboard/summary")
def get_dashboard_summary(
    date_mode: str = Query("dataset"),
    finance_mode: str = Query("inflation"),
    current_user: dict = Depends(require_permission("dashboard.read"))
):
    conn = None

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        
        cursor.execute("""
            SELECT COUNT(*) AS toplam_musteri
            FROM musteriler
        """)
        toplam_musteri = cursor.fetchone()["toplam_musteri"]

        
        cursor.execute("""
            SELECT
                COUNT(*) AS toplam_siparis,
                ROUND(COALESCE(SUM(gercek_tutar), 0), 2) AS toplam_ciro,
                ROUND(COALESCE(AVG(gercek_tutar), 0), 2) AS ortalama_siparis_tutari,
                MIN(siparis_tarihi) AS ilk_siparis_tarihi,
                MAX(siparis_tarihi) AS son_siparis_tarihi
            FROM vw_siparis_gercek
        """)
        satis_ozeti = cursor.fetchone()

        
        cursor.execute("""
            SELECT
                COUNT(DISTINCT musteri_id) AS analiz_edilen_musteri,
                ROUND(COALESCE(SUM(harcama_tutari), 0), 2) AS enflasyon_duzeltilmis_toplam_harcama,
                ROUND(COALESCE(AVG(harcama_tutari), 0), 2) AS ortalama_musteri_harcamasi,
                ROUND(COALESCE(AVG(alisveris_sikligi), 0), 2) AS ortalama_alisveris_sikligi,
                ROUND(COALESCE(AVG(son_alisveris_gunu), 0), 2) AS ortalama_son_alisveris_gunu
            FROM rfm_skorlari
        """)
        rfm_ozeti = cursor.fetchone()

        
        cursor.execute("""
            SELECT
                ROUND(COALESCE(SUM(musteri_yasam_degeri), 0), 2) AS toplam_ltv,
                ROUND(COALESCE(AVG(musteri_yasam_degeri), 0), 2) AS ortalama_ltv,
                ROUND(COALESCE(AVG(churn_olasiligi), 0), 2) AS ortalama_churn_riski,
                SUM(CASE WHEN risk_seviyesi = 'Düşük' THEN 1 ELSE 0 END) AS dusuk_riskli_musteri,
                SUM(CASE WHEN risk_seviyesi = 'Orta' THEN 1 ELSE 0 END) AS orta_riskli_musteri,
                SUM(CASE WHEN risk_seviyesi = 'Yüksek' THEN 1 ELSE 0 END) AS yuksek_riskli_musteri
            FROM ltv_tahminleri
        """)
        ltv_churn_ozeti = cursor.fetchone()

        
        cursor.execute("""
            SELECT
                segment,
                COUNT(*) AS musteri_sayisi,
                ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM rfm_skorlari), 0), 2) AS oran_yuzde
            FROM rfm_skorlari
            GROUP BY segment
            ORDER BY musteri_sayisi DESC
        """)
        segment_dagilimi = cursor.fetchall()

        
        cursor.execute("""
            SELECT
                risk_seviyesi,
                COUNT(*) AS musteri_sayisi,
                ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM ltv_tahminleri), 0), 2) AS oran_yuzde
            FROM ltv_tahminleri
            GROUP BY risk_seviyesi
            ORDER BY musteri_sayisi DESC
        """)
        risk_dagilimi = cursor.fetchall()

        
        cursor.execute("""
            SELECT
                m.musteri_id,
                m.musteri_kodu,
                m.musteri_adi,
                m.musteri_soyadi,
                r.segment,
                r.rfm_skor,
                l.musteri_yasam_degeri,
                l.churn_olasiligi,
                l.risk_seviyesi
            FROM ltv_tahminleri l
            JOIN musteriler m ON l.musteri_id = m.musteri_id
            LEFT JOIN rfm_skorlari r ON l.musteri_id = r.musteri_id
            ORDER BY l.musteri_yasam_degeri DESC
            LIMIT 10
        """)
        en_degerli_musteriler = cursor.fetchall()

        
        cursor.execute("""
            SELECT
                m.musteri_id,
                m.musteri_kodu,
                m.musteri_adi,
                m.musteri_soyadi,
                r.segment,
                r.rfm_skor,
                l.musteri_yasam_degeri,
                l.churn_olasiligi,
                l.risk_seviyesi
            FROM ltv_tahminleri l
            JOIN musteriler m ON l.musteri_id = m.musteri_id
            LEFT JOIN rfm_skorlari r ON l.musteri_id = r.musteri_id
            WHERE l.risk_seviyesi = 'Yüksek'
            ORDER BY l.musteri_yasam_degeri DESC
            LIMIT 10
        """)
        kritik_musteriler = cursor.fetchall()

        
        cursor.execute("""
            SELECT
                YEAR(siparis_tarihi) AS yil,
                MONTH(siparis_tarihi) AS ay,
                COUNT(*) AS siparis_sayisi,
                ROUND(COALESCE(SUM(gercek_tutar), 0), 2) AS toplam_ciro
            FROM vw_siparis_gercek
            GROUP BY YEAR(siparis_tarihi), MONTH(siparis_tarihi)
            ORDER BY yil, ay
        """)
        aylik_ciro_trendi = cursor.fetchall()

        cursor.close()

        return {
            "genel_ozet": {
                "toplam_musteri": toplam_musteri,
                "toplam_siparis": satis_ozeti["toplam_siparis"],
                "toplam_ciro": satis_ozeti["toplam_ciro"],
                "ortalama_siparis_tutari": satis_ozeti["ortalama_siparis_tutari"],
                "ilk_siparis_tarihi": satis_ozeti["ilk_siparis_tarihi"],
                "son_siparis_tarihi": satis_ozeti["son_siparis_tarihi"]
            },
            "rfm_ozeti": rfm_ozeti,
            "ltv_churn_ozeti": ltv_churn_ozeti,
            "segment_dagilimi": segment_dagilimi,
            "risk_dagilimi": risk_dagilimi,
            "en_degerli_musteriler": en_degerli_musteriler,
            "kritik_musteriler": kritik_musteriler,
            "aylik_ciro_trendi": aylik_ciro_trendi
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Dashboard özet hatası: {str(e)}"
        )

    finally:
        if conn and conn.is_connected():
            conn.close()


#========================================
#EXPORT FULL
#========================================
@app.get("/export/full")
def export_full(
    current_user: dict = Depends(require_permission("customers.export"))
):
    conn = None

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        
        cursor.execute("""
            SELECT
                m.musteri_id,
                m.musteri_kodu,
                m.musteri_adi,
                m.musteri_soyadi,
                m.eposta,
                m.telefon,
                m.olusturma_tarihi,

                r.son_alisveris_gunu,
                r.alisveris_sikligi,
                r.harcama_tutari AS enflasyon_duzeltilmis_harcama,
                r.rfm_skor,
                r.segment,
                r.hesaplama_tarihi AS rfm_hesaplama_tarihi,

                l.musteri_yasam_degeri,
                l.churn_olasiligi,
                l.risk_seviyesi,
                l.hesaplama_tarihi AS ltv_churn_hesaplama_tarihi

            FROM musteriler m
            LEFT JOIN rfm_skorlari r 
                ON m.musteri_id = r.musteri_id
            LEFT JOIN ltv_tahminleri l 
                ON m.musteri_id = l.musteri_id
            ORDER BY m.musteri_id
        """)
        customers = cursor.fetchall()
        if "customers.view_sensitive" not in current_user["permissions"]:
            customers = [mask_customer_row(row) for row in customers]

        
        cursor.execute("""
            SELECT
                siparis_id,
                musteri_id,
                fatura_no,
                belge_turu,
                sube_id,
                satis_lokasyonu,
                siparis_tarihi,
                batch_id,
                gercek_tutar,
                siparis_detayi
            FROM vw_siparis_gercek
            ORDER BY siparis_tarihi DESC
        """)
        orders = cursor.fetchall()

        
        cursor.execute("""
            SELECT
                su.siparis_urun_id,
                su.siparis_id,
                su.urun_id,
                u.urun_kodu,
                u.urun_adi,
                su.adet,
                su.birim_fiyat,
                su.satir_toplam
            FROM siparis_urunleri su
            LEFT JOIN urunler u 
                ON su.urun_id = u.urun_id
            ORDER BY su.siparis_id, su.siparis_urun_id
        """)
        order_items = cursor.fetchall()

     
        cursor.execute("""
            SELECT
                u.urun_id,
                u.urun_kodu,
                u.urun_adi,
                u.aktif_mi,
                u.olusturma_tarihi
            FROM urunler u
            ORDER BY u.urun_id
        """)
        products = cursor.fetchall()

       
        cursor.execute("""
            SELECT
                segment,
                COUNT(*) AS musteri_sayisi,
                ROUND(COALESCE(SUM(harcama_tutari), 0), 2) AS toplam_harcama,
                ROUND(COALESCE(AVG(harcama_tutari), 0), 2) AS ortalama_harcama
            FROM rfm_skorlari
            GROUP BY segment
            ORDER BY musteri_sayisi DESC
        """)
        segments = cursor.fetchall()

        
        cursor.execute("""
            SELECT
                risk_seviyesi,
                COUNT(*) AS musteri_sayisi,
                ROUND(COALESCE(AVG(churn_olasiligi), 0), 2) AS ortalama_churn
            FROM ltv_tahminleri
            GROUP BY risk_seviyesi
            ORDER BY musteri_sayisi DESC
        """)
        risk_summary = cursor.fetchall()


        cursor.execute("SELECT COUNT(*) AS toplam_musteri FROM musteriler")
        toplam_musteri = cursor.fetchone()["toplam_musteri"]

        cursor.execute("SELECT COUNT(*) AS toplam_siparis FROM vw_siparis_gercek")
        toplam_siparis = cursor.fetchone()["toplam_siparis"]

        cursor.execute("SELECT COUNT(*) AS toplam_urun FROM urunler")
        toplam_urun = cursor.fetchone()["toplam_urun"]

        cursor.execute("SELECT COUNT(*) AS toplam_kalem FROM siparis_urunleri")
        toplam_kalem = cursor.fetchone()["toplam_kalem"]

        cursor.close()

        return {
            "export_info": {
                "export_type": "full_crm_analytics_export",
                "generated_at": datetime.now().isoformat(),
                "record_counts": {
                    "customers": toplam_musteri,
                    "orders": toplam_siparis,
                    "order_items": toplam_kalem,
                    "products": toplam_urun,
                    "segments": len(segments),
                    "risk_groups": len(risk_summary)
                }
            },
            "customers": customers,
            "orders": orders,
            "order_items": order_items,
            "products": products,
            "segments": segments,
            "risk_summary": risk_summary
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Full export hatası: {str(e)}"
        )

    finally:
        if conn and conn.is_connected():
            conn.close()

 

 #========================================================
 #RFM MATRİS
 #========================================================
@app.get("/analytics/rfm/matrix")
def get_rfm_matrix(
    date_mode: str = Query("dataset", regex="^(live|dataset)$"),
    finance_mode: str = Query("inflation", regex="^(nominal|inflation)$")
):
    conn = None

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                CAST(SUBSTRING(rfm_skor, 1, 1) AS UNSIGNED) AS recency_skor,
                CAST(SUBSTRING(rfm_skor, 2, 1) AS UNSIGNED) AS frequency_skor,
                COUNT(*) AS musteri_sayisi,
                ROUND(COALESCE(SUM(harcama_tutari), 0), 2) AS toplam_harcama,
                ROUND(COALESCE(AVG(harcama_tutari), 0), 2) AS ortalama_harcama
            FROM rfm_skorlari
            WHERE rfm_skor IS NOT NULL
              AND LENGTH(rfm_skor) = 3
              AND rfm_skor REGEXP '^[1-5][1-5][1-5]$'
            GROUP BY
                CAST(SUBSTRING(rfm_skor, 1, 1) AS UNSIGNED),
                CAST(SUBSTRING(rfm_skor, 2, 1) AS UNSIGNED)
            ORDER BY recency_skor DESC, frequency_skor ASC
        """)

        rows = cursor.fetchall()

        cursor.execute("""
            SELECT COUNT(*) AS toplam_musteri
            FROM rfm_skorlari
            WHERE rfm_skor IS NOT NULL
              AND LENGTH(rfm_skor) = 3
              AND rfm_skor REGEXP '^[1-5][1-5][1-5]$'
        """)

        toplam_row = cursor.fetchone()
        toplam_musteri = int(toplam_row["toplam_musteri"] or 0)

        matrix = []

        for r in range(5, 0, -1):
            row_items = []

            for f in range(1, 6):
                found = next(
                    (
                        item for item in rows
                        if int(item["recency_skor"]) == r
                        and int(item["frequency_skor"]) == f
                    ),
                    None
                )

                if found:
                    musteri_sayisi = int(found["musteri_sayisi"] or 0)
                    oran_yuzde = round(
                        musteri_sayisi * 100 / toplam_musteri,
                        2
                    ) if toplam_musteri else 0

                    row_items.append({
                        "recency_skor": r,
                        "frequency_skor": f,
                        "musteri_sayisi": musteri_sayisi,
                        "oran_yuzde": oran_yuzde,
                        "toplam_harcama": float(found["toplam_harcama"] or 0),
                        "ortalama_harcama": float(found["ortalama_harcama"] or 0)
                    })
                else:
                    row_items.append({
                        "recency_skor": r,
                        "frequency_skor": f,
                        "musteri_sayisi": 0,
                        "oran_yuzde": 0,
                        "toplam_harcama": 0,
                        "ortalama_harcama": 0
                    })

            matrix.append({
                "recency_skor": r,
                "cells": row_items
            })

        cursor.close()

        return {
            "description": "RFM 5x5 matrisi. Satırlar Recency, sütunlar Frequency skorudur.",
            "toplam_musteri": toplam_musteri,
            "date_mode": date_mode,
            "finance_mode": finance_mode,
            "matrix": matrix
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"RFM matrisi hatası: {str(e)}"
        )

    finally:
        if conn and conn.is_connected():
            conn.close()

#========================================================
#BATCHES
#========================================================
@app.get("/import/batches")
def get_import_batches(
    page: int = 1,
    page_size: int = 20,
    kaynak_tipi: Optional[str] = None
):
    conn = None

    try:
        if page < 1:
            page = 1

        if page_size < 1:
            page_size = 20

        if page_size > 100:
            page_size = 100

        offset = (page - 1) * page_size

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        where_clauses = []
        params = []

        if kaynak_tipi:
            where_clauses.append("b.kaynak_tipi = %s")
            params.append(kaynak_tipi)

        where_sql = ""
        if where_clauses:
            where_sql = "WHERE " + " AND ".join(where_clauses)

        count_sql = f"""
            SELECT COUNT(*) AS total
            FROM batchler b
            {where_sql}
        """

        cursor.execute(count_sql, params)
        total = cursor.fetchone()["total"]

        data_sql = f"""
            SELECT
                b.batch_id,
                b.kaynak_tipi,
                b.baslama_zamani,
                b.bitis_zamani,
                b.olusturma_tarihi,

                COUNT(s.stg_id) AS toplam_kayit,

                SUM(CASE WHEN s.durum = 'pending' THEN 1 ELSE 0 END) AS pending_kayit,
                SUM(CASE WHEN s.durum = 'cleaned' THEN 1 ELSE 0 END) AS cleaned_kayit,
                SUM(CASE WHEN s.durum = 'error' THEN 1 ELSE 0 END) AS error_kayit,

                ROUND(
                    SUM(CASE WHEN s.durum = 'error' THEN 1 ELSE 0 END) * 100.0
                    / NULLIF(COUNT(s.stg_id), 0),
                    2
                ) AS hata_orani_yuzde

            FROM batchler b
            LEFT JOIN stg_ham_veri s 
                ON b.batch_id = s.batch_id
            {where_sql}
            GROUP BY
                b.batch_id,
                b.kaynak_tipi,
                b.baslama_zamani,
                b.bitis_zamani,
                b.olusturma_tarihi
            ORDER BY b.batch_id DESC
            LIMIT %s OFFSET %s
        """

        data_params = params + [page_size, offset]

        cursor.execute(data_sql, data_params)
        batches = cursor.fetchall()

        cursor.close()

        total_pages = (total + page_size - 1) // page_size

        return {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": total_pages,
            "items": batches
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Import batch listesi hatası: {str(e)}"
        )

    finally:
        if conn and conn.is_connected():
            conn.close()

#========================================================
#BATCH İd
#========================================================
@app.get("/import/batches/{batch_id}")
def get_import_batch_detail(batch_id: int):
    conn = None

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        # 1) Batch genel bilgisi
        cursor.execute("""
            SELECT
                b.batch_id,
                b.kaynak_tipi,
                b.baslama_zamani,
                b.bitis_zamani,
                b.olusturma_tarihi
            FROM batchler b
            WHERE b.batch_id = %s
        """, (batch_id,))

        batch = cursor.fetchone()

        if not batch:
            raise HTTPException(status_code=404, detail="Batch bulunamadı.")

        # 2) Durum özeti
        cursor.execute("""
            SELECT
                COUNT(*) AS toplam_kayit,
                SUM(CASE WHEN durum = 'pending' THEN 1 ELSE 0 END) AS pending_kayit,
                SUM(CASE WHEN durum = 'cleaned' THEN 1 ELSE 0 END) AS cleaned_kayit,
                SUM(CASE WHEN durum = 'error' THEN 1 ELSE 0 END) AS error_kayit,
                ROUND(
                    SUM(CASE WHEN durum = 'error' THEN 1 ELSE 0 END) * 100.0
                    / NULLIF(COUNT(*), 0),
                    2
                ) AS hata_orani_yuzde
            FROM stg_ham_veri
            WHERE batch_id = %s
        """, (batch_id,))

        summary = cursor.fetchone()

        # 3) Hatalı kayıt örnekleri
        cursor.execute("""
            SELECT
                stg_id,
                durum,
                hata_mesaji,
                ham_veri,
                temiz_veri,
                olusturma_tarihi
            FROM stg_ham_veri
            WHERE batch_id = %s
              AND durum = 'error'
            ORDER BY stg_id DESC
            LIMIT 20
        """, (batch_id,))

        error_samples = cursor.fetchall()

        # 4) Son temizlenen kayıt örnekleri
        cursor.execute("""
            SELECT
                stg_id,
                durum,
                ham_veri,
                temiz_veri,
                olusturma_tarihi
            FROM stg_ham_veri
            WHERE batch_id = %s
              AND durum = 'cleaned'
            ORDER BY stg_id DESC
            LIMIT 20
        """, (batch_id,))

        cleaned_samples = cursor.fetchall()

        cursor.close()

        return {
            "batch": batch,
            "summary": summary,
            "error_samples": error_samples,
            "cleaned_samples": cleaned_samples
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Batch detay hatası: {str(e)}"
        )

    finally:
        if conn and conn.is_connected():
            conn.close()



#========================================================
#YETKİLENDİRME
#========================================================

@app.get("/auth/users")
def get_auth_users(
    current_user: dict = Depends(require_permission("users.read"))
):
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                k.kullanici_id AS id,
                CONCAT(COALESCE(k.ad, ''), ' ', COALESCE(k.soyad, '')) AS name,
                k.eposta AS email,
                COALESCE(r.rol_adi, 'rol_yok') AS role,
                CASE 
                    WHEN k.aktif_mi = 1 THEN 'Aktif'
                    ELSE 'Pasif'
                END AS status
            FROM kullanicilar k
            LEFT JOIN kullanici_rolleri kr 
                ON k.kullanici_id = kr.kullanici_id
            LEFT JOIN roller r 
                ON kr.rol_id = r.rol_id
            ORDER BY k.kullanici_id ASC
        """)

        rows = cursor.fetchall()
        cursor.close()

        return {"items": rows}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Kullanıcı listesi hatası: {str(e)}")

    finally:
        if conn and conn.is_connected():
            conn.close()


@app.get("/auth/roles-permissions")
def get_roles_permissions(
    current_user: dict = Depends(require_permission("permissions.update"))
):
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                yetki_id AS id,
                yetki_kodu AS code,
                yetki_adi AS name,
                modul AS module,
                aciklama AS `desc`
            FROM yetkiler
            WHERE aktif_mi = 1
            ORDER BY modul ASC, yetki_id ASC
        """)
        permissions = cursor.fetchall()

        cursor.execute("""
            SELECT
                rol_id AS id,
                rol_adi AS name,
                rol_adi AS label,
                aciklama AS `desc`,
                sistem_rolu_mu,
                aktif_mi
            FROM roller
            WHERE aktif_mi = 1
            ORDER BY rol_id ASC
        """)
        roles = cursor.fetchall()

        for role in roles:
            cursor.execute("""
                SELECT y.yetki_kodu AS code
                FROM rol_yetkileri ry
                INNER JOIN yetkiler y 
                    ON ry.yetki_id = y.yetki_id
                WHERE ry.rol_id = %s
                ORDER BY y.yetki_id ASC
            """, (role["id"],))

            role["permissions"] = [row["code"] for row in cursor.fetchall()]

            if role["name"] == "super_admin":
                role["label"] = "Süper Admin"
            elif role["name"] == "admin":
                role["label"] = "Admin"
            elif role["name"] in ["analysis", "analyst"]:
                role["label"] = "Analist"
            elif role["name"] == "user":
                role["label"] = "Kullanıcı"

        cursor.close()

        return {
            "roles": roles,
            "permissions": permissions
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Rol-yetki listesi hatası: {str(e)}")

    finally:
        if conn and conn.is_connected():
            conn.close()


@app.put("/auth/roles/{role_id}/permissions")
def update_role_permissions(
    role_id: int,
    payload: RolePermissionUpdate,
    current_user: dict = Depends(require_permission("permissions.update"))
):
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT rol_id
            FROM roller
            WHERE rol_id = %s AND aktif_mi = 1
        """, (role_id,))

        role = cursor.fetchone()

        if not role:
            raise HTTPException(status_code=404, detail="Rol bulunamadı")

        cursor.execute("""
            DELETE FROM rol_yetkileri
            WHERE rol_id = %s
        """, (role_id,))

        if not payload.permissions:
            conn.commit()
            cursor.close()

            return {
                "message": "Rol yetkileri temizlendi",
                "role_id": role_id,
                "permission_count": 0
            }

        placeholders = ",".join(["%s"] * len(payload.permissions))

        cursor.execute(f"""
            SELECT yetki_id, yetki_kodu
            FROM yetkiler
            WHERE aktif_mi = 1
            AND yetki_kodu IN ({placeholders})
        """, payload.permissions)

        permission_rows = cursor.fetchall()

        for permission in permission_rows:
            cursor.execute("""
                INSERT INTO rol_yetkileri (
                    rol_id,
                    yetki_id,
                    atanma_tarihi
                )
                VALUES (%s, %s, NOW())
            """, (role_id, permission["yetki_id"]))

        conn.commit()
        cursor.close()

        return {
            "message": "Rol yetkileri güncellendi",
            "role_id": role_id,
            "permission_count": len(permission_rows)
        }

    except HTTPException:
        raise

    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Rol yetki güncelleme hatası: {str(e)}")

    finally:
        if conn and conn.is_connected():
            conn.close()


class UserCreateUpdate(BaseModel):
    name: str
    email: EmailStr
    role: str
    status: str = "Aktif"


@app.post("/auth/users")
def create_auth_user(
    payload: UserCreateUpdate,
    current_user: dict = Depends(require_permission("users.create"))
):
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        parts = payload.name.strip().split(" ", 1)
        ad = parts[0]
        soyad = parts[1] if len(parts) > 1 else ""

        cursor.execute("""
            INSERT INTO kullanicilar (
                eposta, sifre_hash, aktif_mi, olusturma_tarihi, ad, soyad
            )
            VALUES (%s, %s, %s, NOW(), %s, %s)
        """, (
            payload.email,
            "12345",
            1 if payload.status == "Aktif" else 0,
            ad,
            soyad
        ))

        kullanici_id = cursor.lastrowid

        cursor.execute("SELECT rol_id FROM roller WHERE rol_adi = %s", (payload.role,))
        role = cursor.fetchone()

        if role:
            cursor.execute("""
                INSERT INTO kullanici_rolleri (kullanici_id, rol_id, atanma_tarihi)
                VALUES (%s, %s, NOW())
            """, (kullanici_id, role["rol_id"]))

        conn.commit()
        cursor.close()

        return {"message": "Kullanıcı oluşturuldu", "user_id": kullanici_id}

    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Kullanıcı oluşturma hatası: {str(e)}")

    finally:
        if conn and conn.is_connected():
            conn.close()


@app.put("/auth/users/{user_id}")
def update_auth_user(
    user_id: int,
    payload: UserCreateUpdate,
    current_user: dict = Depends(require_permission("users.update"))
):
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        parts = payload.name.strip().split(" ", 1)
        ad = parts[0]
        soyad = parts[1] if len(parts) > 1 else ""

        cursor.execute("""
            UPDATE kullanicilar
            SET eposta = %s,
                aktif_mi = %s,
                ad = %s,
                soyad = %s
            WHERE kullanici_id = %s
        """, (
            payload.email,
            1 if payload.status == "Aktif" else 0,
            ad,
            soyad,
            user_id
        ))

        cursor.execute("SELECT rol_id FROM roller WHERE rol_adi = %s", (payload.role,))
        role = cursor.fetchone()

        if role:
            cursor.execute("DELETE FROM kullanici_rolleri WHERE kullanici_id = %s", (user_id,))
            cursor.execute("""
                INSERT INTO kullanici_rolleri (kullanici_id, rol_id, atanma_tarihi)
                VALUES (%s, %s, NOW())
            """, (user_id, role["rol_id"]))

        conn.commit()
        cursor.close()

        return {"message": "Kullanıcı güncellendi", "user_id": user_id}

    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Kullanıcı güncelleme hatası: {str(e)}")

    finally:
        if conn and conn.is_connected():
            conn.close()


@app.delete("/auth/users/{user_id}")
def delete_auth_user(
    user_id: int,
    current_user: dict = Depends(require_permission("users.delete"))
):
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE kullanicilar
            SET aktif_mi = 0
            WHERE kullanici_id = %s
        """, (user_id,))

        conn.commit()
        cursor.close()

        return {"message": "Kullanıcı pasifleştirildi", "user_id": user_id}

    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Kullanıcı silme hatası: {str(e)}")

    finally:
        if conn and conn.is_connected():
            conn.close()



# =========================================================
# LOG MODELLERİ
# =========================================================

class AuditLogCreate(BaseModel):
    kullanici_id: Optional[int] = None
    islem_tipi: str
    tablo_adi: Optional[str] = None
    kayit_id: Optional[int] = None
    aciklama: Optional[str] = None
    eski_deger: Optional[Any] = None
    yeni_deger: Optional[Any] = None


class LoginLogCreate(BaseModel):
    kullanici_id: Optional[int] = None
    eposta: str
    basarili_mi: bool
    hata_mesaji: Optional[str] = None


class AnalizLogCreate(BaseModel):
    kullanici_id: Optional[int] = None
    analiz_tipi: str
    durum: str = "basladi"
    islenen_kayit_sayisi: int = 0
    hata_mesaji: Optional[str] = None


class RaporIndirmeLogCreate(BaseModel):
    rapor_id: Optional[int] = None
    kullanici_id: Optional[int] = None
    dosya_adi: str
    dosya_formati: str
    filtre_ozeti: Optional[str] = None


class SistemHataLogCreate(BaseModel):
    kullanici_id: Optional[int] = None
    endpoint: str
    hata_kodu: Optional[str] = None
    hata_mesaji: str
    detay: Optional[str] = None


# =========================================================
# LOG HELPER
# =========================================================

def get_request_ip(request: Request):
    return request.client.host if request.client else None


def get_request_user_agent(request: Request):
    return request.headers.get("user-agent")


def json_to_text(value):
    if value is None:
        return None
    try:
        return json.dumps(value, ensure_ascii=False)
    except Exception:
        return str(value)


# =========================================================
# LOG KAYDETME ENDPOINTLERİ
# =========================================================

@app.post("/logs/audit")
def create_audit_log(log: AuditLogCreate, request: Request):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            INSERT INTO audit_loglari
            (
                kullanici_id,
                islem_tipi,
                tablo_adi,
                kayit_id,
                aciklama,
                eski_deger,
                yeni_deger,
                ip_adresi,
                user_agent
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            log.kullanici_id,
            log.islem_tipi,
            log.tablo_adi,
            log.kayit_id,
            log.aciklama,
            json_to_text(log.eski_deger),
            json_to_text(log.yeni_deger),
            get_request_ip(request),
            get_request_user_agent(request)
        ))

        conn.commit()
        return {"message": "Audit log kaydedildi"}

    finally:
        cursor.close()
        conn.close()


@app.post("/logs/login")
def create_login_log(log: LoginLogCreate, request: Request):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            INSERT INTO login_loglari
            (
                kullanici_id,
                eposta,
                basarili_mi,
                hata_mesaji,
                ip_adresi,
                user_agent
            )
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            log.kullanici_id,
            log.eposta,
            1 if log.basarili_mi else 0,
            log.hata_mesaji,
            get_request_ip(request),
            get_request_user_agent(request)
        ))

        conn.commit()
        return {"message": "Login log kaydedildi"}

    finally:
        cursor.close()
        conn.close()


@app.post("/logs/analiz")
def create_analiz_log(log: AnalizLogCreate):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            INSERT INTO analiz_calisma_loglari
            (
                kullanici_id,
                analiz_tipi,
                baslama_zamani,
                durum,
                islenen_kayit_sayisi,
                hata_mesaji
            )
            VALUES (%s, %s, NOW(), %s, %s, %s)
        """, (
            log.kullanici_id,
            log.analiz_tipi,
            log.durum,
            log.islenen_kayit_sayisi,
            log.hata_mesaji
        ))

        conn.commit()

        return {
            "message": "Analiz log kaydedildi",
            "analiz_log_id": cursor.lastrowid
        }

    finally:
        cursor.close()
        conn.close()


@app.put("/logs/analiz/{analiz_log_id}/finish")
def finish_analiz_log(
    analiz_log_id: int,
    durum: str = "basarili",
    islenen_kayit_sayisi: int = 0,
    hata_mesaji: Optional[str] = None
):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            UPDATE analiz_calisma_loglari
            SET
                bitis_zamani = NOW(),
                durum = %s,
                islenen_kayit_sayisi = %s,
                hata_mesaji = %s
            WHERE analiz_log_id = %s
        """, (
            durum,
            islenen_kayit_sayisi,
            hata_mesaji,
            analiz_log_id
        ))

        conn.commit()
        return {"message": "Analiz log güncellendi"}

    finally:
        cursor.close()
        conn.close()

@app.post("/logs/rapor-indirme")
def create_rapor_indirme_log(log: RaporIndirmeLogCreate):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            INSERT INTO rapor_indirme_loglari
            (
                rapor_id,
                kullanici_id,
                dosya_adi,
                `dosya_formatı`,
                filtre_ozeti
            )
            VALUES (%s, %s, %s, %s, %s)
        """, (
            log.rapor_id,
            log.kullanici_id,
            log.dosya_adi,
            log.dosya_formati,
            log.filtre_ozeti
        ))

        conn.commit()
        return {"message": "Rapor indirme log kaydedildi"}

    finally:
        cursor.close()
        conn.close()


@app.post("/raporlar/export-log")
def create_export_log(data: dict):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        rapor_adi = data.get("rapor_adi")
        rapor_tipi = data.get("rapor_tipi")
        aciklama = data.get("aciklama")
        dosya_formati = data.get("dosya_formati", "csv")
        kullanici_id = data.get("kullanici_id")
        filtre_ozeti = data.get("filtre_ozeti")

        # =====================================================
        # RAPOR KAYDI OLUŞTUR
        # =====================================================

        cursor.execute("""
            INSERT INTO raporlar
            (
                rapor_adi,
                rapor_tipi,
                aciklama,
                `dosya_formatı`,
                olusturan_kullanici_id,
                olusturma_tarihi
            )
            VALUES (%s, %s, %s, %s, %s, NOW())
        """, (
            rapor_adi,
            rapor_tipi,
            aciklama,
            dosya_formati,
            kullanici_id
        ))

        rapor_id = cursor.lastrowid

        # =====================================================
        # İNDİRME LOGU OLUŞTUR
        # =====================================================

        cursor.execute("""
            INSERT INTO rapor_indirme_loglari
            (
                rapor_id,
                kullanici_id,
                dosya_adi,
                `dosya_formatı`,
                filtre_ozeti
            )
            VALUES (%s, %s, %s, %s, %s)
        """, (
            rapor_id,
            kullanici_id,
            f"{rapor_adi}.{dosya_formati}",
            dosya_formati,
            filtre_ozeti
        ))

        conn.commit()

        return {
            "message": "Export log oluşturuldu",
            "rapor_id": rapor_id
        }

    except Exception as e:
        conn.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Export log hatası: {str(e)}"
        )

    finally:
        cursor.close()
        conn.close()


@app.post("/logs/sistem-hata")
def create_sistem_hata_log(log: SistemHataLogCreate, request: Request):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            INSERT INTO sistem_hata_loglari
            (
                kullanici_id,
                endpoint,
                hata_kodu,
                hata_mesaji,
                detay,
                ip_adresi,
                user_agent
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            log.kullanici_id,
            log.endpoint,
            log.hata_kodu,
            log.hata_mesaji,
            log.detay,
            get_request_ip(request),
            get_request_user_agent(request)
        ))

        conn.commit()
        return {"message": "Sistem hata log kaydedildi"}

    finally:
        cursor.close()
        conn.close()


# =========================================================
# FRONTEND İÇİN LOG LİSTESİ
# =========================================================

@app.get("/logs")
def get_all_logs(
    search: Optional[str] = None,
    type: str = "all",
    page: int = 1,
    page_size: int = 50
):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        sql = """
            SELECT *
            FROM (
                SELECT
                    audit_id AS id,
                    kullanici_id,
                    'audit' AS source,
                    islem_tipi AS type,
                    COALESCE(aciklama, 'Audit işlemi') AS detail,
                    ip_adresi AS ip,
                    user_agent,
                    olusturma_tarihi AS date,
                    CASE
                        WHEN islem_tipi IN (
                            'suspicious_login',
                            'kvkk_mask',
                            'kvkk_unmask',
                            'mask_removal',
                            'maske_kaldirma',
                            'kvkk_maske',
                            'kvkk'
                        ) THEN 'suspicious'
                        ELSE 'normal'
                    END AS status
                FROM audit_loglari

                UNION ALL

                SELECT
                    login_log_id AS id,
                    kullanici_id,
                    'login' AS source,
                    CASE
                        WHEN basarili_mi = 1 THEN 'login'
                        ELSE 'login_failed'
                    END AS type,
                    CASE
                        WHEN basarili_mi = 1 THEN 'CRM sistemine başarılı giriş yapıldı'
                        ELSE COALESCE(hata_mesaji, 'Başarısız giriş denemesi')
                    END AS detail,
                    ip_adresi AS ip,
                    user_agent,
                    giris_tarihi AS date,
                    CASE
                        WHEN basarili_mi = 1 THEN 'normal'
                        ELSE 'alert'
                    END AS status
                FROM login_loglari

                UNION ALL

                SELECT
                    analiz_log_id AS id,
                    kullanici_id,
                    'analiz' AS source,
                    analiz_tipi AS type,
                    CASE
                        WHEN hata_mesaji IS NOT NULL THEN hata_mesaji
                        ELSE CONCAT(analiz_tipi, ' analizi çalıştırıldı')
                    END AS detail,
                    NULL AS ip,
                    NULL AS user_agent,
                    baslama_zamani AS date,
                    CASE
                        WHEN durum IN ('hata', 'failed', 'basarisiz') THEN 'alert'
                        ELSE 'normal'
                    END AS status
                FROM analiz_calisma_loglari

                UNION ALL

                SELECT
                    indirme_log_id AS id,
                    kullanici_id,
                    'rapor' AS source,
                    'export' AS type,
                    CONCAT(
                        dosya_adi,
                        ' dosyası indirildi'
                    ) AS detail,
                    NULL AS ip,
                    NULL AS user_agent,
                    indirme_tarihi AS date,
                    'suspicious' AS status
                FROM rapor_indirme_loglari

                UNION ALL

                SELECT
                    batch_id AS id,
                    kullanici_id,
                    'import' AS source,
                    'data_upload' AS type,
                    CONCAT(COALESCE(kaynak_tipi, 'Bilinmeyen kaynak'), ' verisi yüklendi') AS detail,
                    NULL AS ip,
                    NULL AS user_agent,
                    COALESCE(olusturma_tarihi, baslama_zamani, bitis_zamani) AS date,
                    'normal' AS status
                FROM batchler

                UNION ALL

                SELECT
                    hata_id AS id,
                    kullanici_id,
                    'sistem_hata' AS source,
                    endpoint AS type,
                    hata_mesaji AS detail,
                    ip_adresi AS ip,
                    user_agent,
                    olusturma_tarihi AS date,
                    'alert' AS status
                FROM sistem_hata_loglari
            ) AS logs
            WHERE 1 = 1
        """

        params = []

        if search:
            sql += """
                AND (
                    detail LIKE %s
                    OR ip LIKE %s
                    OR type LIKE %s
                    OR source LIKE %s
                    OR kullanici_id IN (
                        SELECT kullanici_id
                        FROM kullanicilar
                        WHERE eposta LIKE %s
                        OR ad LIKE %s
                        OR soyad LIKE %s
                    )
                )
            """
            s = f"%{search}%"
            params.extend([s, s, s, s, s, s, s])

        if type != "all":
            if type == "suspicious":
                sql += " AND status != 'normal'"
            else:
                sql += " AND type = %s"
                params.append(type)

        offset = (page - 1) * page_size

        sql += """
            ORDER BY date DESC
            LIMIT %s OFFSET %s
        """

        params.extend([page_size, offset])

        cursor.execute(sql, params)
        rows = cursor.fetchall()

        result = []

        for row in rows:
            user_text = "Bilinmeyen Kullanıcı"

            if row["kullanici_id"]:
                cursor.execute("""
                    SELECT
                        eposta,
                        CONCAT(COALESCE(ad, ''), ' ', COALESCE(soyad, '')) AS ad_soyad
                    FROM kullanicilar
                    WHERE kullanici_id = %s
                    LIMIT 1
                """, (row["kullanici_id"],))

                user_row = cursor.fetchone()

                if user_row:
                    ad_soyad = (user_row.get("ad_soyad") or "").strip()
                    eposta = user_row.get("eposta") or ""

                    if ad_soyad:
                        user_text = f"{ad_soyad} ({eposta})"
                    elif eposta:
                        user_text = eposta
                    else:
                        user_text = f"Kullanıcı #{row['kullanici_id']}"

            result.append({
                "id": row["id"],
                "user": user_text,
                "type": row["type"],
                "detail": row["detail"],
                "date": row["date"].strftime("%Y-%m-%d %H:%M:%S") if row["date"] else None,
                "ip": row["ip"] or "-",
                "status": row["status"],
                "source": row["source"]
            })

        return result

    finally:
        cursor.close()
        conn.close()


# =========================================================
# LOG STATS
# =========================================================

@app.get("/logs/stats")
def get_log_stats():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                (
                    SELECT COUNT(*) FROM audit_loglari
                ) +
                (
                    SELECT COUNT(*) FROM login_loglari
                ) +
                (
                    SELECT COUNT(*) FROM analiz_calisma_loglari
                ) +
                (
                    SELECT COUNT(*) FROM rapor_indirme_loglari
                ) +
                (
                    SELECT COUNT(*) FROM sistem_hata_loglari
                ) +
                (
                    SELECT COUNT(*) FROM batchler
                ) AS total
        """)
        total = cursor.fetchone()["total"] or 0

        cursor.execute("""
            SELECT
                (
                    SELECT COUNT(*) FROM login_loglari
                    WHERE basarili_mi = 0
                ) +
                (
                    SELECT COUNT(*) FROM rapor_indirme_loglari
                ) +
                (
                    SELECT COUNT(*) FROM sistem_hata_loglari
                ) +
                (
                    SELECT COUNT(*) FROM audit_loglari
                    WHERE islem_tipi IN (
                        'suspicious_login',
                        'kvkk_mask',
                        'kvkk_unmask',
                        'mask_removal',
                        'maske_kaldirma',
                        'kvkk_maske',
                        'kvkk'
                    )
                ) AS suspicious
        """)
        suspicious = cursor.fetchone()["suspicious"] or 0

        cursor.execute("""
            SELECT COUNT(DISTINCT kullanici_id) AS activeUsers
            FROM login_loglari
            WHERE DATE(giris_tarihi) = CURDATE()
            AND basarili_mi = 1
        """)
        active_users = cursor.fetchone()["activeUsers"] or 0

        cursor.execute("""
            SELECT COUNT(*) AS highRiskUsers
            FROM (
                SELECT kullanici_id, COUNT(*) AS risk_count
                FROM (
                    SELECT kullanici_id
                    FROM login_loglari
                    WHERE basarili_mi = 0

                    UNION ALL

                    SELECT kullanici_id
                    FROM rapor_indirme_loglari

                    UNION ALL

                    SELECT kullanici_id
                    FROM sistem_hata_loglari

                    UNION ALL

                    SELECT kullanici_id
                    FROM audit_loglari
                    WHERE islem_tipi IN (
                        'suspicious_login',
                        'kvkk_mask',
                        'kvkk_unmask',
                        'mask_removal',
                        'maske_kaldirma',
                        'kvkk_maske',
                        'kvkk'
                    )
                ) risk_logs
                WHERE kullanici_id IS NOT NULL
                GROUP BY kullanici_id
                HAVING risk_count >= 3
            ) risky
        """)
        high_risk_users = cursor.fetchone()["highRiskUsers"] or 0

        return {
            "total": total,
            "suspicious": suspicious,
            "activeUsers": active_users,
            "highRiskUsers": high_risk_users
        }

    finally:
        cursor.close()
        conn.close()


# =========================================================
# KULLANICI & SON İŞLEM & RİSK SKORU
# =========================================================

@app.get("/logs/users")
def get_log_users(search: Optional[str] = None):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        sql = """
            SELECT
                k.kullanici_id AS id,
                CONCAT(COALESCE(k.ad, ''), ' ', COALESCE(k.soyad, '')) AS name,
                k.eposta AS username,
                'Kullanıcı' AS role,
                CASE
                    WHEN k.aktif_mi = 1 THEN 'active'
                    ELSE 'offline'
                END AS status
            FROM kullanicilar k
            WHERE 1 = 1
        """

        params = []

        if search:
            sql += """
                AND (
                    k.ad LIKE %s OR
                    k.soyad LIKE %s OR
                    k.eposta LIKE %s
                )
            """
            s = f"%{search}%"
            params.extend([s, s, s])

        sql += " ORDER BY k.kullanici_id DESC"

        cursor.execute(sql, params)
        users = cursor.fetchall()

        result = []

        for user in users:
            user_id = user["id"]

            cursor.execute("""
                SELECT detay
                FROM (
                    SELECT
                        aciklama AS detay,
                        olusturma_tarihi AS tarih
                    FROM audit_loglari
                    WHERE kullanici_id = %s

                    UNION ALL

                    SELECT
                        CASE
                            WHEN basarili_mi = 1 THEN 'Giriş yapıldı'
                            ELSE COALESCE(hata_mesaji, 'Başarısız giriş')
                        END AS detay,
                        giris_tarihi AS tarih
                    FROM login_loglari
                    WHERE kullanici_id = %s

                    UNION ALL

                    SELECT
                        CONCAT(analiz_tipi, ' analizi') AS detay,
                        baslama_zamani AS tarih
                    FROM analiz_calisma_loglari
                    WHERE kullanici_id = %s

                    UNION ALL

                    SELECT
                        CONCAT(dosya_adi, ' indirildi') AS detay,
                        indirme_tarihi AS tarih
                    FROM rapor_indirme_loglari
                    WHERE kullanici_id = %s

                    UNION ALL

                    SELECT
                        hata_mesaji AS detay,
                        olusturma_tarihi AS tarih
                    FROM sistem_hata_loglari
                    WHERE kullanici_id = %s
                ) x
                ORDER BY tarih DESC
                LIMIT 1
            """, (user_id, user_id, user_id, user_id, user_id))

            last = cursor.fetchone()

            cursor.execute("""
                SELECT
                    (
                        SELECT COUNT(*)
                        FROM login_loglari
                        WHERE kullanici_id = %s
                        AND basarili_mi = 0
                    ) +
                    (
                        SELECT COUNT(*)
                        FROM rapor_indirme_loglari
                        WHERE kullanici_id = %s
                    ) +
                    (
                        SELECT COUNT(*)
                        FROM sistem_hata_loglari
                        WHERE kullanici_id = %s
                    ) +
                    (
                        SELECT COUNT(*)
                        FROM audit_loglari
                        WHERE kullanici_id = %s
                        AND islem_tipi IN (
                            'suspicious_login',
                            'kvkk_mask',
                            'kvkk_unmask',
                            'mask_removal',
                            'maske_kaldirma',
                            'kvkk_maske',
                            'kvkk'
                        )
                    ) AS risk_count
            """, (user_id, user_id, user_id, user_id))

            risk_count = cursor.fetchone()["risk_count"] or 0
            risk_score = min(100, risk_count * 20)

            result.append({
                "id": user["id"],
                "name": (user["name"] or "").strip() or "İsimsiz Kullanıcı",
                "username": user["username"],
                "role": user["role"],
                "status": user["status"],
                "lastAction": last["detay"] if last else "Henüz işlem yok",
                "riskScore": risk_score
            })

        return result

    finally:
        cursor.close()
        conn.close()




# =========================================================
# KALİTE ANALİZİ   batch seçmeli
# =========================================================
@app.get("/import/batches/{batch_id}/quality")
def get_batch_quality(batch_id: int):
    conn = None

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT 
                COUNT(*) AS toplam,
                SUM(CASE WHEN durum = 'pending' THEN 1 ELSE 0 END) AS pending,
                SUM(CASE WHEN durum = 'cleaned' THEN 1 ELSE 0 END) AS cleaned,
                SUM(CASE WHEN durum = 'processed' THEN 1 ELSE 0 END) AS processed,
                SUM(CASE WHEN durum = 'error' THEN 1 ELSE 0 END) AS error
            FROM stg_ham_veri
            WHERE batch_id = %s
        """, (batch_id,))

        row = cursor.fetchone()

        toplam = row["toplam"] or 0
        pending = row["pending"] or 0
        cleaned = row["cleaned"] or 0
        processed = row["processed"] or 0
        error = row["error"] or 0

        if toplam == 0:
            quality_score = 0
        else:
            quality_score = round((processed / toplam) * 100, 2)

        return {
            "batch_id": batch_id,
            "toplam": toplam,
            "pending": pending,
            "cleaned": cleaned,
            "processed": processed,
            "error": error,
            "quality_score": quality_score,
            "completeness_score": quality_score,
            "validity_score": 100 if error == 0 else max(0, 100 - (error * 10)),
            "consistency_score": quality_score,
            "uniqueness_score": 100,
            "accuracy_score": quality_score,
            "critical_errors": [],
            "warnings": []
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Kalite analizi hatası: {str(e)}")

    finally:
        if conn and conn.is_connected():
            conn.close()

# =========================================================
# VERİ KONTROLÜ   batch seçmeli
# =========================================================
@app.get("/import/quality/summary")
def get_import_quality_summary():
    conn = None

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT 
                COUNT(*) AS toplam,
                SUM(CASE WHEN durum = 'pending' THEN 1 ELSE 0 END) AS pending,
                SUM(CASE WHEN durum = 'cleaned' THEN 1 ELSE 0 END) AS cleaned,
                SUM(CASE WHEN durum = 'processed' THEN 1 ELSE 0 END) AS processed,
                SUM(CASE WHEN durum = 'error' THEN 1 ELSE 0 END) AS error
            FROM stg_ham_veri
        """)

        row = cursor.fetchone()

        toplam = row["toplam"] or 0
        pending = row["pending"] or 0
        cleaned = row["cleaned"] or 0
        processed = row["processed"] or 0
        error = row["error"] or 0

        quality_score = round((processed / toplam) * 100, 2) if toplam else 0

        return {
            "toplam": toplam,
            "pending": pending,
            "cleaned": cleaned,
            "processed": processed,
            "error": error,
            "quality_score": quality_score,
            "completeness_score": quality_score,
            "validity_score": 100 if error == 0 else max(0, 100 - (error * 10)),
            "consistency_score": quality_score,
            "uniqueness_score": 100,
            "accuracy_score": quality_score,
            "critical_errors": [],
            "warnings": []
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Genel kalite özeti hatası: {str(e)}")

    finally:
        if conn and conn.is_connected():
            conn.close()
            

# =========================================================
# KAMPANYA YÖNETİMİ ENDPOINTLERİ
# Mevcut tabloları kullanır, tablo oluşturmaz.
# =========================================================
class CampaignCreateRequest(BaseModel):
    name: str
    target_goal: Optional[str] = None
    segments: Optional[List[str]] = []
    subject: Optional[str] = None
    body: Optional[str] = None
    couponRate: Optional[str] = None
    couponCode: Optional[str] = None
    predictedPerformance: Optional[str] = None
    timing: Optional[str] = "now"

class CustomerCampaignApplyRequest(BaseModel):
    customerId: int
    customerName: Optional[str] = None
    email: Optional[str] = None
    campaign: Dict[str, Any]


def kampanya_segment_adi(segment_id: str):
    mapping = {
        "vip": "Şampiyon",
        "churn": "Risk Altında",
        "new": "Yeni Müşteri",
        "loyal": "Sadık Müşteri",
    }

    return mapping.get(segment_id, segment_id)





@app.get("/campaigns/summary")
def campaigns_summary(
    current_user: dict = Depends(get_current_user)
):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT COUNT(*) AS total_campaigns
            FROM kampanyalar
        """)
        total_campaigns = cursor.fetchone()["total_campaigns"]

        cursor.execute("""
            SELECT COUNT(*) AS active_campaigns
            FROM kampanyalar
            WHERE durum IN ('aktif', 'yayinda', 'başlatıldı', 'baslatildi')
        """)
        active_campaigns = cursor.fetchone()["active_campaigns"]

        cursor.execute("""
            SELECT COUNT(*) AS coupon_count
            FROM kuponlar
        """)
        coupon_count = cursor.fetchone()["coupon_count"]

        cursor.execute("""
            SELECT COUNT(*) AS coupon_usage
            FROM kupon_kullanimlari
        """)
        coupon_usage = cursor.fetchone()["coupon_usage"]

        return {
            "success": True,
            "total_campaigns": total_campaigns,
            "active_campaigns": active_campaigns,
            "coupon_count": coupon_count,
            "coupon_usage": coupon_usage,
            "conversion_rate": "%0",
            "estimated_revenue": 0,
        }

    finally:
        cursor.close()
        conn.close()



@app.get("/campaigns")
def get_campaigns(
    current_user: dict = Depends(get_current_user)
):
    conn = None
    cursor = None

    try:
        cached = get_cache("campaigns_list", ttl_seconds=120)

        if cached:
            return cached

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                k.kampanya_id,
                k.kampanya_adi,
                k.kampanya_tipi,
                k.hedef_segment,
                k.konu,
                k.mesaj,
                k.durum,
                k.baslangic_tarihi,
                k.bitis_tarihi,
                k.kaynak,
                k.olusturma_tarihi,

                COALESCE(
                    GROUP_CONCAT(
                        DISTINCT ku.kupon_kodu
                        SEPARATOR ', '
                    ),
                    '-'
                ) AS kupon_kodu

            FROM kampanyalar k FORCE INDEX (idx_kampanyalar_liste)

            LEFT JOIN kuponlar ku FORCE INDEX (idx_kupon_kampanya)
                ON ku.kampanya_id = k.kampanya_id

            GROUP BY
                k.kampanya_id,
                k.kampanya_adi,
                k.kampanya_tipi,
                k.hedef_segment,
                k.konu,
                k.mesaj,
                k.durum,
                k.baslangic_tarihi,
                k.bitis_tarihi,
                k.kaynak,
                k.olusturma_tarihi

            ORDER BY
                k.olusturma_tarihi DESC,
                k.kampanya_id DESC

            LIMIT 100
        """)

        campaigns = cursor.fetchall()

        result = {
            "success": True,
            "items": campaigns
        }

        set_cache("campaigns_list", result)

        return result

    except Exception as e:
        print("KAMPANYA LISTE HATASI:", str(e))

        raise HTTPException(
            status_code=500,
            detail=f"Kampanyalar alınamadı: {str(e)}"
        )

    finally:
        if cursor:
            cursor.close()

        if conn and conn.is_connected():
            conn.close()



@app.post("/campaigns")
def create_campaign(
    data: CampaignCreateRequest,
    current_user: dict = Depends(get_current_user)
):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        hedef_segment = ", ".join([
            kampanya_segment_adi(segment)
            for segment in data.segments or []
        ])

        cursor.execute("""
            INSERT INTO kampanyalar
            (
                kampanya_adi,
                kampanya_tipi,
                hedef_segment,
                konu,
                mesaj,
                durum,
                baslangic_tarihi,
                bitis_tarihi,
                olusturan_kullanici_id,
                ai_ile_olusturuldu_mu,
                olusturma_tarihi,
                guncelleme_tarihi
            )
            VALUES
            (%s, %s, %s, %s, %s, %s, NOW(), NULL, %s, %s, NOW(), NOW())
        """, (
            data.name,
            data.target_goal or "Genel Kampanya",
            hedef_segment,
            data.subject,
            data.body,
            "taslak",
            current_user.get("kullanici_id"),
            1 if data.subject or data.body else 0
        ))

        kampanya_id = cursor.lastrowid

        if data.couponCode:
            import time
            import random

            base_coupon_code = str(data.couponCode).strip()

            cursor.execute("""
                SELECT COUNT(*)
                FROM kuponlar
                WHERE kupon_kodu = %s
            """, (base_coupon_code,))

            exists = cursor.fetchone()[0]

            if exists:
                final_coupon_code = f"{base_coupon_code}-{int(time.time())}-{random.randint(1000, 9999)}"
            else:
                final_coupon_code = base_coupon_code

            cursor.execute("""
                INSERT INTO kuponlar
                (
                    kampanya_id,
                    kupon_kodu,
                    kupon_adi,
                    indirim_tipi,
                    indirim_degeri,
                    minimum_tutar,
                    maksimum_indirim,
                    kullanim_limiti,
                    kisi_basi_limit,
                    baslangic_tarihi,
                    bitis_tarihi,
                    aktif_mi,
                    olusturma_tarihi
                )
                VALUES
                (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NULL, 1, NOW())
            """, (
                kampanya_id,
                final_coupon_code,
                data.name,
                "yuzde",
                float(data.couponRate or 0),
                0,
                None,
                None,
                1
            ))

        for segment in data.segments or []:
            cursor.execute("""
                SELECT musteri_id
                FROM rfm_skorlari
                WHERE segment = %s
            """, (kampanya_segment_adi(segment),))

            customers = cursor.fetchall()

            for customer in customers:
                musteri_id = customer[0]

                cursor.execute("""
                    INSERT INTO kampanya_hedefleri
                    (
                        kampanya_id,
                        musteri_id,
                        hedef_tipi,
                        gonderim_durumu,
                        olusturma_tarihi
                    )
                    VALUES (%s, %s, %s, %s, NOW())
                """, (
                    kampanya_id,
                    musteri_id,
                    "segment",
                    "beklemede"
                ))

        conn.commit()

        return {
            "success": True,
            "message": "Kampanya oluşturuldu.",
            "kampanya_id": kampanya_id,
            "couponCode": final_coupon_code if data.couponCode else None
        }

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Kampanya oluşturma hatası: {str(e)}")

    finally:
        cursor.close()
        conn.close()

@app.post("/campaigns/{kampanya_id}/launch")
def launch_campaign(
    kampanya_id: int,
    current_user: dict = Depends(get_current_user)
):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            UPDATE kampanyalar
            SET durum = 'aktif',
                baslangic_tarihi = NOW(),
                guncelleme_tarihi = NOW()
            WHERE kampanya_id = %s
        """, (kampanya_id,))

        conn.commit()

        return {
            "success": True,
            "message": "Kampanya aktif edildi."
        }

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Kampanya aktif etme hatası: {str(e)}")

    finally:
        cursor.close()
        conn.close()


@app.get("/campaigns/playbooks/list")
def get_campaign_playbooks(
    current_user: dict = Depends(get_current_user)
):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                playbook_id AS id,
                playbook_adi AS title,
                playbook_tipi AS type,
                aciklama AS description,
                kosul_json,
                aksiyon_json,
                aktif_mi,
                olusturma_tarihi
            FROM kampanya_playbooklari
            ORDER BY playbook_id DESC
        """)

        rows = cursor.fetchall()

        if rows:
            return {
                "success": True,
                "items": rows
            }

        return {
            "success": True,
            "items": [
                {
                    "id": 1,
                    "title": "Akıllı Churn Önleme",
                    "type": "churn",
                    "description": "Riskli müşterilere otomatik geri kazanım kampanyası önerilir.",
                    "estimated_conversion": "%8.5",
                    "segments": ["churn"],
                    "coupon_rate": "15",
                },
                {
                    "id": 2,
                    "title": "VIP Yükseltme",
                    "type": "vip",
                    "description": "Şampiyon ve sadık müşterilere özel premium kampanya önerilir.",
                    "estimated_conversion": "%12.4",
                    "segments": ["vip", "loyal"],
                    "coupon_rate": "10",
                },
                {
                    "id": 3,
                    "title": "İkinci Alışveriş Teşviki",
                    "type": "new",
                    "description": "Yeni müşterilerin tekrar satın alma oranını artırır.",
                    "estimated_conversion": "%9.1",
                    "segments": ["new"],
                    "coupon_rate": "10",
                },
            ]
        }

    finally:
        cursor.close()
        conn.close()


@app.post("/campaigns/customer-applied")
def create_customer_applied_campaign(
    data: CustomerCampaignApplyRequest,
    current_user: dict = Depends(get_current_user)
):
    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor()

        campaign = data.campaign or {}

        title = campaign.get("title") or "Kişiye Özel Kampanya"
        description = campaign.get("description") or campaign.get("mailBody") or ""
        coupon_code = campaign.get("couponCode") or f"CRM{data.customerId}"

        cursor.execute("""
            INSERT INTO kampanyalar
            (
                kampanya_adi,
                kampanya_tipi,
                hedef_segment,
                konu,
                mesaj,
                durum,
                baslangic_tarihi,
                bitis_tarihi,
                olusturan_kullanici_id,
                ai_ile_olusturuldu_mu,
                olusturma_tarihi,
                guncelleme_tarihi,
                kaynak
            )
            VALUES (%s, %s, %s, %s, %s, %s, NOW(), NULL, %s, %s, NOW(), NOW(), %s)
        """, (
            title,
            "kişiye_özel",
            f"Kişiye Özel - {data.customerName or data.customerId}",
            campaign.get("mailSubject") or title,
            description,
            "mail_gonderildi",
            current_user.get("kullanici_id"),
            1,
            "Müşteri 360"
        ))

        kampanya_id = cursor.lastrowid

        cursor.execute("""
            INSERT INTO kuponlar
            (
                kampanya_id,
                kupon_kodu,
                indirim_tipi,
                indirim_degeri,
                baslangic_tarihi,
                bitis_tarihi,
                kullanim_limiti,
                aktif_mi,
                olusturma_tarihi
            )
            VALUES (%s, %s, %s, %s, NOW(), NULL, %s, %s, NOW())
        """, (
            kampanya_id,
            coupon_code,
            "oran",
            10,
            1,
            1
        ))

        cursor.execute("""
            INSERT IGNORE INTO kampanya_hedefleri
            (
                kampanya_id,
                musteri_id,
                gonderim_durumu,
                gonderim_tarihi,
                olusturma_tarihi
            )
            VALUES (%s, %s, %s, NOW(), NOW())
        """, (
            kampanya_id,
            data.customerId,
            "mail_gonderildi"
        ))

        conn.commit()

        CACHE.pop("campaigns_list", None)

        return {
            "success": True,
            "message": "Müşteri 360 kampanyası kampanyalar listesine eklendi.",
            "kampanya_id": kampanya_id
        }

    except Exception as e:
        if conn:
            conn.rollback()

        print("CUSTOMER APPLIED CAMPAIGN HATASI:", str(e))

        raise HTTPException(
            status_code=500,
            detail=f"Müşteri kampanyası kayıt hatası: {str(e)}"
        )

    finally:
        if cursor:
            cursor.close()

        if conn and conn.is_connected():
            conn.close()


# =========================================================
# DASHBOARD FILTERS
# =========================================================
@app.get("/customers/filters")
def get_customer_filters(
    current_user: dict = Depends(get_current_user)
):
    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT DISTINCT
                COALESCE(se.sehir_adi, sb.sube_adi, 'Bilinmiyor') AS city
            FROM siparisler s
            LEFT JOIN subeler sb ON sb.sube_id = s.sube_id
            LEFT JOIN sehirler se ON se.sehir_id = sb.sehir_id
            WHERE s.siparis_tarihi IS NOT NULL
            ORDER BY city ASC
        """)

        rows = cursor.fetchall()

        cities = [
            row["city"]
            for row in rows
            if row.get("city")
        ]

        return {
            "cities": cities,
            "sehirler": cities
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Filtreler alınamadı: {str(e)}"
        )

    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()


@app.get("/dashboard/analytics")
def get_dashboard_analytics(
    city: str = Query("Tümü"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    amount_mode: str = Query("reel"),
    recency_mode: str = Query("data_relative"),
    current_user: dict = Depends(get_current_user)
):
    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        # =====================================================
        # REFERANS TARİH
        # =====================================================
        cursor.execute("""
            SELECT MAX(siparis_tarihi) AS reference_date
            FROM vw_siparis_gercek
            WHERE siparis_tarihi IS NOT NULL
        """)

        ref_row = cursor.fetchone()
        reference_date = (
            ref_row["reference_date"]
            if ref_row and ref_row["reference_date"]
            else datetime.now()
        )

        # =====================================================
        # TÜFE
        # =====================================================
        cursor.execute("""
            SELECT kumulatif_katsayi AS hedef_tufe
            FROM enflasyon_endeksi
            ORDER BY yil DESC, ay DESC
            LIMIT 1
        """)

        hedef_row = cursor.fetchone()
        hedef_tufe = float(hedef_row["hedef_tufe"]) if hedef_row else 1

        # =====================================================
        # ORTAK WHERE
        # =====================================================
        where = """
            WHERE v.siparis_tarihi IS NOT NULL
              AND v.musteri_id IS NOT NULL
        """

        params = []

        if start_date:
            where += " AND DATE(v.siparis_tarihi) >= %s"
            params.append(start_date)

        if end_date:
            where += " AND DATE(v.siparis_tarihi) <= %s"
            params.append(end_date)

        if city and city != "Tümü":
            where += """
                AND COALESCE(se.sehir_adi, v.satis_lokasyonu, 'Bilinmiyor') = %s
            """
            params.append(city)

        # =====================================================
        # KPI
        # =====================================================
        cursor.execute(f"""
            SELECT
                COUNT(DISTINCT v.musteri_id) AS musteri_sayisi,
                COUNT(DISTINCT v.siparis_id) AS siparis_sayisi,

                COALESCE(SUM(v.gercek_tutar), 0) AS toplam_ciro_nominal,

                COALESCE(SUM(
                    CASE
                        WHEN e.kumulatif_katsayi IS NOT NULL
                        THEN v.gercek_tutar * (%s / e.kumulatif_katsayi)
                        ELSE v.gercek_tutar
                    END
                ), 0) AS toplam_ciro_reel,

                COALESCE(AVG(v.gercek_tutar), 0) AS ortalama_siparis_tutari,

                COUNT(DISTINCT CASE
                    WHEN lt.risk_seviyesi IN ('Yüksek Risk', 'Riskli', 'Kritik', 'Yüksek', 'High')
                    THEN v.musteri_id
                END) AS riskli_musteri

            FROM vw_siparis_gercek v

            LEFT JOIN subeler sb 
                ON sb.sube_id = v.sube_id

            LEFT JOIN sehirler se 
                ON se.sehir_id = sb.sehir_id

            LEFT JOIN enflasyon_endeksi e
                ON YEAR(v.siparis_tarihi) = e.yil
               AND MONTH(v.siparis_tarihi) = e.ay

            LEFT JOIN ltv_tahminleri lt 
                ON lt.musteri_id = v.musteri_id

            {where}
        """, [hedef_tufe] + params)

        kpis = cursor.fetchone() or {}

        musteri_sayisi = int(kpis.get("musteri_sayisi") or 0)
        riskli_musteri = int(kpis.get("riskli_musteri") or 0)

        churn_orani = round(
            (riskli_musteri / musteri_sayisi) * 100,
            2
        ) if musteri_sayisi > 0 else 0

        # =====================================================
        # CİRO TREND
        # =====================================================
        cursor.execute(f"""
            SELECT
                DATE_FORMAT(v.siparis_tarihi, '%Y-%m') AS name,

                COALESCE(SUM(v.gercek_tutar), 0) AS nominal,

                COALESCE(SUM(
                    CASE
                        WHEN e.kumulatif_katsayi IS NOT NULL
                        THEN v.gercek_tutar * (%s / e.kumulatif_katsayi)
                        ELSE v.gercek_tutar
                    END
                ), 0) AS reel

            FROM vw_siparis_gercek v

            LEFT JOIN subeler sb 
                ON sb.sube_id = v.sube_id

            LEFT JOIN sehirler se 
                ON se.sehir_id = sb.sehir_id

            LEFT JOIN enflasyon_endeksi e
                ON YEAR(v.siparis_tarihi) = e.yil
               AND MONTH(v.siparis_tarihi) = e.ay

            {where}

            GROUP BY DATE_FORMAT(v.siparis_tarihi, '%Y-%m')
            ORDER BY name ASC
        """, [hedef_tufe] + params)

        trend_rows = cursor.fetchall()

        ciro_trend = []
        prev_value = 0

        for row in trend_rows:
            current_value = float(
                row["reel"] if amount_mode == "reel" else row["nominal"]
            )

            ciro_trend.append({
                "name": row["name"],
                "nominal": float(row["nominal"] or 0),
                "reel": float(row["reel"] or 0),
                "prev": prev_value
            })

            prev_value = current_value

        # =====================================================
        # SEGMENT DAĞILIMI
        # =====================================================
        cursor.execute("""
            SELECT
                COALESCE(segment, 'Segment Yok') AS name,
                COUNT(*) AS value
            FROM rfm_skorlari
            GROUP BY COALESCE(segment, 'Segment Yok')
            ORDER BY value DESC
        """)

        segment_rows = cursor.fetchall()

        total_segment = sum(
            int(row["value"] or 0)
            for row in segment_rows
        )

        segment_dagilimi = []

        for row in segment_rows:
            value = int(row["value"] or 0)
            percent = round((value / total_segment) * 100, 2) if total_segment else 0

            segment_dagilimi.append({
                "name": row["name"],
                "value": value,
                "percent": percent
            })

        # =====================================================
        # KATEGORİ PERFORMANSI
        # =====================================================
        kategori_where = """
            WHERE s.siparis_tarihi IS NOT NULL
              AND s.belge_turu_id = 1
        """

        kategori_params = [hedef_tufe]

        if start_date:
            kategori_where += " AND DATE(s.siparis_tarihi) >= %s"
            kategori_params.append(start_date)

        if end_date:
            kategori_where += " AND DATE(s.siparis_tarihi) <= %s"
            kategori_params.append(end_date)

        if city and city != "Tümü":
            kategori_where += """
                AND COALESCE(se.sehir_adi, sb.sube_adi, 'Bilinmiyor') = %s
            """
            kategori_params.append(city)

        cursor.execute(f"""
            SELECT
                COALESCE(k.kategori_adi, 'Diğer') AS name,

                COALESCE(SUM(
                    CASE
                        WHEN e.kumulatif_katsayi IS NOT NULL
                        THEN su.adet * su.birim_fiyat * (%s / e.kumulatif_katsayi)
                        ELSE su.adet * su.birim_fiyat
                    END
                ), 0) AS value

            FROM siparisler s

            INNER JOIN siparis_urunleri su 
                ON su.siparis_id = s.siparis_id

            LEFT JOIN urun_kategorileri uk 
                ON uk.urun_id = su.urun_id

            LEFT JOIN kategoriler k 
                ON k.kategori_id = uk.kategori_id

            LEFT JOIN subeler sb 
                ON sb.sube_id = s.sube_id

            LEFT JOIN sehirler se 
                ON se.sehir_id = sb.sehir_id

            LEFT JOIN enflasyon_endeksi e
                ON YEAR(s.siparis_tarihi) = e.yil
               AND MONTH(s.siparis_tarihi) = e.ay

            {kategori_where}

            GROUP BY COALESCE(k.kategori_adi, 'Diğer')
            ORDER BY value DESC
            LIMIT 8
        """, kategori_params)

        kategori_rows = cursor.fetchall()

        kategori_performansi = [
            {
                "name": row["name"],
                "value": float(row["value"] or 0)
            }
            for row in kategori_rows
        ]

        # =====================================================
        # BÖLGESEL DAĞILIM
        # =====================================================
        cursor.execute(f"""
            SELECT
                COALESCE(se.sehir_adi, v.satis_lokasyonu, 'Bilinmiyor') AS city,

                COALESCE(SUM(
                    CASE
                        WHEN e.kumulatif_katsayi IS NOT NULL
                        THEN v.gercek_tutar * (%s / e.kumulatif_katsayi)
                        ELSE v.gercek_tutar
                    END
                ), 0) AS value

            FROM vw_siparis_gercek v

            LEFT JOIN subeler sb 
                ON sb.sube_id = v.sube_id

            LEFT JOIN sehirler se 
                ON se.sehir_id = sb.sehir_id

            LEFT JOIN enflasyon_endeksi e
                ON YEAR(v.siparis_tarihi) = e.yil
               AND MONTH(v.siparis_tarihi) = e.ay

            {where}

            GROUP BY COALESCE(se.sehir_adi, v.satis_lokasyonu, 'Bilinmiyor')
            ORDER BY value DESC
            LIMIT 8
        """, [hedef_tufe] + params)

        bolge_rows = cursor.fetchall()

        max_bolge = max(
            [float(row["value"] or 0) for row in bolge_rows],
            default=0
        )

        bolgesel_dagilim = [
            {
                "city": row["city"],
                "value": float(row["value"] or 0),
                "perc": round(
                    (float(row["value"] or 0) / max_bolge) * 100,
                    2
                ) if max_bolge else 0
            }
            for row in bolge_rows
        ]

        # =====================================================
        # ALIŞVERİŞ YOĞUNLUĞU
        # =====================================================
        cursor.execute(f"""
            SELECT
                gun_no,
                saat,
                ROUND(AVG(siparis_adedi), 2) AS ortalama_siparis
            FROM (
                SELECT
                    DATE(v.siparis_tarihi) AS tarih,
                    DAYOFWEEK(v.siparis_tarihi) AS gun_no,
                    HOUR(v.siparis_tarihi) AS saat,
                    COUNT(DISTINCT v.siparis_id) AS siparis_adedi

                FROM vw_siparis_gercek v

                LEFT JOIN subeler sb 
                    ON sb.sube_id = v.sube_id

                LEFT JOIN sehirler se 
                    ON se.sehir_id = sb.sehir_id

                {where}

                GROUP BY
                    DATE(v.siparis_tarihi),
                    DAYOFWEEK(v.siparis_tarihi),
                    HOUR(v.siparis_tarihi)
            ) x

            GROUP BY gun_no, saat
            ORDER BY gun_no ASC, saat ASC
        """, params)

        heatmap_rows = cursor.fetchall()

        gun_map = {
            2: "Pazartesi",
            3: "Salı",
            4: "Çarşamba",
            5: "Perşembe",
            6: "Cuma",
            7: "Cumartesi",
            1: "Pazar",
        }

        siparis_yogunluk_heatmap = [
            {
                "gun": gun_map.get(int(row["gun_no"] or 0), "Bilinmiyor"),
                "gun_no": int(row["gun_no"] or 0),
                "saat": int(row["saat"] or 0),
                "siparis_sayisi": float(row["ortalama_siparis"] or 0)
            }
            for row in heatmap_rows
        ]

        # =====================================================
        # COHORT ANALİZİ
        # =====================================================
        def parse_date_value(value):
            if isinstance(value, str):
                return datetime.strptime(value[:10], "%Y-%m-%d").date()
            if hasattr(value, "date"):
                return value.date()
            return value

        def month_start(value):
            d = parse_date_value(value)
            return d.replace(day=1)

        def add_months(value, months):
            year = value.year + ((value.month - 1 + months) // 12)
            month = ((value.month - 1 + months) % 12) + 1
            return value.replace(year=year, month=month, day=1)

        cohort_reference_date = reference_date

        if end_date:
            cohort_reference_date = datetime.strptime(end_date, "%Y-%m-%d")

        cohort_reference_month = month_start(cohort_reference_date)

        cohort_months = [
            add_months(cohort_reference_month, -5),
            add_months(cohort_reference_month, -4),
            add_months(cohort_reference_month, -3),
            add_months(cohort_reference_month, -2),
            add_months(cohort_reference_month, -1),
            cohort_reference_month,
        ]

        cohort_city_filter = ""
        cohort_params = []

        if city and city != "Tümü":
            cohort_city_filter = """
                AND COALESCE(se.sehir_adi, sb.sube_adi, 'Bilinmiyor') = %s
            """
            cohort_params.append(city)

        cursor.execute(f"""
            SELECT
                s.musteri_id,
                DATE_FORMAT(MIN(s.siparis_tarihi), '%Y-%m-01') AS cohort_month
            FROM siparisler s

            LEFT JOIN subeler sb 
                ON sb.sube_id = s.sube_id

            LEFT JOIN sehirler se 
                ON se.sehir_id = sb.sehir_id

            WHERE s.siparis_tarihi IS NOT NULL
              AND s.belge_turu_id = 1
              {cohort_city_filter}

            GROUP BY s.musteri_id
        """, cohort_params)

        first_order_rows = cursor.fetchall()

        first_order_map = {}

        for row in first_order_rows:
            if row["cohort_month"]:
                first_order_map[row["musteri_id"]] = datetime.strptime(
                    row["cohort_month"],
                    "%Y-%m-%d"
                ).date()

        cursor.execute(f"""
            SELECT
                s.musteri_id,
                DATE_FORMAT(s.siparis_tarihi, '%Y-%m-01') AS activity_month
            FROM siparisler s

            LEFT JOIN subeler sb 
                ON sb.sube_id = s.sube_id

            LEFT JOIN sehirler se 
                ON se.sehir_id = sb.sehir_id

            WHERE s.siparis_tarihi IS NOT NULL
              AND s.belge_turu_id = 1
              {cohort_city_filter}

            GROUP BY 
                s.musteri_id,
                DATE_FORMAT(s.siparis_tarihi, '%Y-%m-01')
        """, cohort_params)

        activity_rows = cursor.fetchall()

        activity_map = {}

        for row in activity_rows:
            if row["activity_month"]:
                activity_month = datetime.strptime(
                    row["activity_month"],
                    "%Y-%m-%d"
                ).date()

                activity_map.setdefault(row["musteri_id"], set()).add(activity_month)

        cohort_analizi = []

        for cohort_month in cohort_months:
            cohort_customers = [
                musteri_id
                for musteri_id, first_month in first_order_map.items()
                if first_month == cohort_month
            ]

            base_count = len(cohort_customers)

            row = {
                "month": cohort_month.strftime("%Y-%m"),
                "base": base_count,
                "m1": 100 if base_count else 0,
                "m2": None,
                "m3": None,
                "m4": None,
                "m5": None,
                "m6": None,
            }

            for offset in range(1, 6):
                target_month = add_months(cohort_month, offset)

                if target_month > cohort_reference_month:
                    row[f"m{offset + 1}"] = None
                    continue

                active_count = 0

                for musteri_id in cohort_customers:
                    if target_month in activity_map.get(musteri_id, set()):
                        active_count += 1

                row[f"m{offset + 1}"] = (
                    round((active_count / base_count) * 100, 1)
                    if base_count else 0
                )

            cohort_analizi.append(row)

        # =====================================================
        # RESPONSE
        # =====================================================
        return {
            "filters": {
                "city": city,
                "start_date": start_date,
                "end_date": end_date,
                "amount_mode": amount_mode,
                "recency_mode": recency_mode,
                "reference_date": str(reference_date)
            },

            "kpis": {
                "toplam_ciro_nominal": float(kpis.get("toplam_ciro_nominal") or 0),
                "toplam_ciro_reel": float(kpis.get("toplam_ciro_reel") or 0),
                "musteri_sayisi": musteri_sayisi,
                "siparis_sayisi": int(kpis.get("siparis_sayisi") or 0),
                "ortalama_siparis_tutari": float(kpis.get("ortalama_siparis_tutari") or 0),
                "riskli_musteri": riskli_musteri,
                "churn_orani": churn_orani,
                "veri_kalite_skoru": 100,
                "aktif_musteri": musteri_sayisi
            },

            "ciro_trend": ciro_trend,
            "segment_dagilimi": segment_dagilimi,
            "kategori_performansi": kategori_performansi,
            "bolgesel_dagilim": bolgesel_dagilim,
            "siparis_yogunluk_heatmap": siparis_yogunluk_heatmap,
            "cohort_analizi": cohort_analizi,

            "churn_panel": {
                "riskli_musteri": riskli_musteri
            }
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Dashboard analytics hatası: {str(e)}"
        )

    finally:
        if cursor:
            cursor.close()

        if conn and conn.is_connected():
            conn.close()


# =========================================================
# DASHBOARD ENDPOINTLERİ
# filters / sales / orders / customers
# =========================================================

def safe_float(value):
    try:
        return float(value or 0)
    except:
        return 0.0


def safe_int(value):
    try:
        return int(value or 0)
    except:
        return 0


def normalize_filter_value(value):
    if value is None or value == "" or value == "Tümü":
        return None
    return value


def month_expr(date_col):
    return f"CONCAT(YEAR({date_col}), '-', LPAD(MONTH({date_col}), 2, '0'))"


def month_group(date_col):
    return f"CONCAT(YEAR({date_col}), '-', LPAD(MONTH({date_col}), 2, '0'))"


def online_case():
    return """
        CASE
            WHEN INSTR(LOWER(COALESCE(st.satis_tipi_adi, '')), 'online') > 0
              OR INSTR(LOWER(COALESCE(st.satis_tipi_adi, '')), 'web') > 0
              OR INSTR(LOWER(COALESCE(st.satis_tipi_adi, '')), 'internet') > 0
              OR INSTR(LOWER(COALESCE(st.satis_tipi_adi, '')), 'sporthink.com.tr') > 0
              OR INSTR(LOWER(COALESCE(st.satis_tipi_adi, '')), '.com') > 0
            THEN 'Online'
            ELSE 'Mağaza'
        END
    """


def build_dashboard_where(
    start_date=None,
    end_date=None,
    city="Tümü",
    branch="Tümü",
    brand="Tümü",
    category="Tümü",
    channel="Tümü",
    return_status="Tümü",
    only_sales=False
):
    where = ["s.siparis_tarihi IS NOT NULL"]
    params = []

    if start_date:
        where.append("DATE(s.siparis_tarihi) >= %s")
        params.append(start_date)

    if end_date:
        where.append("DATE(s.siparis_tarihi) <= %s")
        params.append(end_date)

    if only_sales:
        where.append("COALESCE(s.belge_turu_id, 1) = 1")

    city = normalize_filter_value(city)
    branch = normalize_filter_value(branch)
    brand = normalize_filter_value(brand)
    category = normalize_filter_value(category)
    channel = normalize_filter_value(channel)

    if city:
        where.append("se.sehir_adi = %s")
        params.append(city)

    if branch:
        where.append("sb.sube_adi = %s")
        params.append(branch)

    if brand:
        where.append("ma.marka_adi = %s")
        params.append(brand)

    if category:
        where.append("ka.kategori_adi = %s")
        params.append(category)

    if channel:
        if channel == "Online":
            where.append(f"{online_case()} = 'Online'")
        elif channel == "Mağaza":
            where.append(f"{online_case()} = 'Mağaza'")

    if return_status == "İade Var":
        where.append("i.iade_id IS NOT NULL")

    if return_status == "İade Yok":
        where.append("i.iade_id IS NULL")

    return " AND ".join(where), params


def dashboard_joins(include_iade=False):
    joins = """
        FROM siparisler s
        LEFT JOIN siparis_urunleri su ON su.siparis_id = s.siparis_id
        LEFT JOIN subeler sb ON sb.sube_id = s.sube_id
        LEFT JOIN sehirler se ON se.sehir_id = sb.sehir_id
        LEFT JOIN satis_tipleri st ON st.satis_tipi_id = s.satis_tipi_id
        LEFT JOIN urunler u ON u.urun_id = su.urun_id
        LEFT JOIN urun_markalari um ON um.urun_id = u.urun_id
        LEFT JOIN markalar ma ON ma.marka_id = um.marka_id
        LEFT JOIN urun_kategorileri uk ON uk.urun_id = u.urun_id
        LEFT JOIN kategoriler ka ON ka.kategori_id = uk.kategori_id
        LEFT JOIN enflasyon_endeksi e
            ON YEAR(s.siparis_tarihi) = e.yil
           AND MONTH(s.siparis_tarihi) = e.ay
        LEFT JOIN (
            SELECT kumulatif_katsayi AS hedef_tufe
            FROM enflasyon_endeksi
            ORDER BY yil DESC, ay DESC
            LIMIT 1
        ) hedef ON 1 = 1
    """

    if include_iade:
        joins += """
            LEFT JOIN iadeler i ON i.siparis_id = s.siparis_id
        """
    else:
        joins += """
            LEFT JOIN iadeler i ON i.siparis_id = s.siparis_id
        """

    return joins


def nominal_amount():
    return "COALESCE(su.adet, 0) * COALESCE(su.birim_fiyat, 0)"


def reel_amount():
    return """
        CASE
            WHEN e.kumulatif_katsayi IS NOT NULL
             AND e.kumulatif_katsayi > 0
             AND hedef.hedef_tufe IS NOT NULL
            THEN (COALESCE(su.adet, 0) * COALESCE(su.birim_fiyat, 0))
                 * (hedef.hedef_tufe / e.kumulatif_katsayi)
            ELSE COALESCE(su.adet, 0) * COALESCE(su.birim_fiyat, 0)
        END
    """


@app.get("/dashboard/filters")
def dashboard_filters(current_user: dict = Depends(get_current_user)):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT sehir_adi AS name
            FROM sehirler
            WHERE sehir_adi IS NOT NULL AND sehir_adi <> ''
            ORDER BY sehir_adi
        """)
        cities = cursor.fetchall()

        cursor.execute("""
            SELECT sube_adi AS name
            FROM subeler
            WHERE sube_adi IS NOT NULL AND sube_adi <> ''
            ORDER BY sube_adi
        """)
        branches = cursor.fetchall()

        cursor.execute("""
            SELECT marka_adi AS name
            FROM markalar
            WHERE marka_adi IS NOT NULL AND marka_adi <> ''
            ORDER BY marka_adi
        """)
        brands = cursor.fetchall()

        cursor.execute("""
            SELECT kategori_adi AS name
            FROM kategoriler
            WHERE kategori_adi IS NOT NULL AND kategori_adi <> ''
            ORDER BY kategori_adi
        """)
        categories = cursor.fetchall()

        cursor.execute("""
            SELECT DISTINCT segment AS name
            FROM rfm_skorlari
            WHERE segment IS NOT NULL AND segment <> ''
            ORDER BY segment
        """)
        segments = cursor.fetchall()

        return {
            "cities": ["Tümü"] + [x["name"] for x in cities],
            "branches": ["Tümü"] + [x["name"] for x in branches],
            "brands": ["Tümü"] + [x["name"] for x in brands],
            "categories": ["Tümü"] + [x["name"] for x in categories],
            "channels": ["Tümü", "Online", "Mağaza"],
            "segments": ["Tümü"] + [x["name"] for x in segments],
        }

    finally:
        cursor.close()
        conn.close()

#=======================================0

@app.get("/dashboard/sales")
def dashboard_sales(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    city: str = "Tümü",
    branch: str = "Tümü",
    brand: str = "Tümü",
    category: str = "Tümü",
    channel: str = "Tümü",
    amount_mode: str = "reel",
    campaign_sale: str = "Tümü",
    include_returns: str = "Dahil",
    min_revenue: Optional[float] = None,
    max_revenue: Optional[float] = None,
    current_user: dict = Depends(get_current_user)
):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        where_sql, params = build_dashboard_where(
            start_date=start_date,
            end_date=end_date,
            city=city,
            branch=branch,
            brand=brand,
            category=category,
            channel=channel,
            only_sales=True
        )

        joins = dashboard_joins(include_iade=True)

        nominal_sql = nominal_amount()
        reel_sql = reel_amount()
        selected_sql = reel_sql if amount_mode == "reel" else nominal_sql

        cursor.execute(f"""
            SELECT
                COALESCE(SUM({nominal_sql}), 0) AS toplam_ciro_nominal,
                COALESCE(SUM({reel_sql}), 0) AS toplam_ciro_reel,
                COALESCE(SUM(COALESCE(su.adet, 0)), 0) AS toplam_satis_adedi,
                COALESCE(SUM({selected_sql}) / NULLIF(COUNT(DISTINCT s.siparis_id), 0), 0) AS ortalama_sepet
            {joins}
            WHERE {where_sql}
        """, params)
        kpis = cursor.fetchone() or {}

        cursor.execute(f"""
            SELECT
                {month_expr("s.siparis_tarihi")} AS name,
                ROUND(COALESCE(SUM({selected_sql}), 0), 2) AS value
            {joins}
            WHERE {where_sql}
            GROUP BY {month_group("s.siparis_tarihi")}
            ORDER BY {month_group("s.siparis_tarihi")}
        """, params)
        ciro_trend = cursor.fetchall()

        cursor.execute(f"""
            SELECT
                {month_expr("s.siparis_tarihi")} AS name,
                ROUND(COALESCE(SUM({nominal_sql}), 0), 2) AS nominal,
                ROUND(COALESCE(SUM({reel_sql}), 0), 2) AS reel
            {joins}
            WHERE {where_sql}
            GROUP BY {month_group("s.siparis_tarihi")}
            ORDER BY {month_group("s.siparis_tarihi")}
        """, params)
        reel_nominal_karsilastirma = cursor.fetchall()

        cursor.execute(f"""
            SELECT
                COALESCE(ma.marka_adi, 'Bilinmiyor') AS name,
                ROUND(COALESCE(SUM({selected_sql}), 0), 2) AS value
            {joins}
            WHERE {where_sql}
            GROUP BY COALESCE(ma.marka_adi, 'Bilinmiyor')
            ORDER BY value DESC
            LIMIT 8
        """, params)
        marka_performansi = cursor.fetchall()

        cursor.execute(f"""
            SELECT
                COALESCE(ka.kategori_adi, 'Bilinmiyor') AS name,
                ROUND(COALESCE(SUM({selected_sql}), 0), 2) AS value
            {joins}
            WHERE {where_sql}
            GROUP BY COALESCE(ka.kategori_adi, 'Bilinmiyor')
            ORDER BY value DESC
            LIMIT 8
        """, params)
        kategori_performansi = cursor.fetchall()

        cursor.execute(f"""
            SELECT
                {online_case()} AS name,
                ROUND(COALESCE(SUM({selected_sql}), 0), 2) AS value
            {joins}
            WHERE {where_sql}
            GROUP BY name
            ORDER BY value DESC
        """, params)
        satis_kanali_dagilimi = cursor.fetchall()

        return {
            "kpis": {
                "toplam_ciro_nominal": safe_float(kpis.get("toplam_ciro_nominal")),
                "toplam_ciro_reel": safe_float(kpis.get("toplam_ciro_reel")),
                "toplam_satis_adedi": safe_float(kpis.get("toplam_satis_adedi")),
                "ortalama_sepet": safe_float(kpis.get("ortalama_sepet")),
                "en_guclu_marka": marka_performansi[0]["name"] if marka_performansi else "-",
                "en_guclu_kategori": kategori_performansi[0]["name"] if kategori_performansi else "-",
            },
            "ciro_trend": ciro_trend,
            "reel_nominal_karsilastirma": reel_nominal_karsilastirma,
            "marka_performansi": marka_performansi,
            "kategori_performansi": kategori_performansi,
            "satis_kanali_dagilimi": satis_kanali_dagilimi,
        }

    finally:
        cursor.close()
        conn.close()


@app.get("/dashboard/orders")
def dashboard_orders(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    city: str = "Tümü",
    branch: str = "Tümü",
    brand: str = "Tümü",
    category: str = "Tümü",
    channel: str = "Tümü",
    return_status: str = "Tümü",
    amount_mode: str = "reel",
    min_order_amount: Optional[float] = None,
    product_count: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        where_sql, params = build_dashboard_where(
            start_date=start_date,
            end_date=end_date,
            city=city,
            branch=branch,
            brand=brand,
            category=category,
            channel=channel,
            return_status=return_status,
            only_sales=False
        )

        joins = dashboard_joins(include_iade=True)

        cursor.execute(f"""
            SELECT
                COUNT(DISTINCT CASE WHEN COALESCE(s.belge_turu_id, 1) = 1 THEN s.siparis_id END) AS toplam_siparis,
                COUNT(DISTINCT i.iade_id) AS toplam_iade,
                ROUND(
                    COALESCE(SUM(CASE WHEN COALESCE(s.belge_turu_id, 1) = 1 THEN COALESCE(su.adet, 0) ELSE 0 END), 0)
                    / NULLIF(COUNT(DISTINCT CASE WHEN COALESCE(s.belge_turu_id, 1) = 1 THEN s.siparis_id END), 0),
                    2
                ) AS ortalama_urun_sayisi
            {joins}
            WHERE {where_sql}
        """, params)
        kpis = cursor.fetchone() or {}

        toplam_siparis = safe_float(kpis.get("toplam_siparis"))
        toplam_iade = safe_float(kpis.get("toplam_iade"))
        iade_orani = round((toplam_iade / toplam_siparis) * 100, 2) if toplam_siparis else 0

        cursor.execute(f"""
            SELECT
                {month_expr("s.siparis_tarihi")} AS name,
                COUNT(DISTINCT s.siparis_id) AS value
            {joins}
            WHERE {where_sql}
              AND COALESCE(s.belge_turu_id, 1) = 1
            GROUP BY {month_group("s.siparis_tarihi")}
            ORDER BY {month_group("s.siparis_tarihi")}
        """, params)
        siparis_trend = cursor.fetchall()

        cursor.execute(f"""
            SELECT
                {month_expr("s.siparis_tarihi")} AS name,
                COUNT(DISTINCT CASE WHEN COALESCE(s.belge_turu_id, 1) = 1 THEN s.siparis_id END) AS satis,
                COUNT(DISTINCT i.iade_id) AS iade
            {joins}
            WHERE {where_sql}
            GROUP BY {month_group("s.siparis_tarihi")}
            ORDER BY {month_group("s.siparis_tarihi")}
        """, params)
        satis_iade_karsilastirma = cursor.fetchall()

        # İADE ORANI TRENDİ
        cursor.execute(f"""
            SELECT
                {month_expr("s.siparis_tarihi")} AS name,
                ROUND(
                    COUNT(DISTINCT i.iade_id)
                    / NULLIF(
                        COUNT(DISTINCT CASE
                            WHEN COALESCE(s.belge_turu_id, 1) = 1
                            THEN s.siparis_id
                        END),
                        0
                    ) * 100,
                    2
                ) AS value
            {joins}
            WHERE {where_sql}
            GROUP BY {month_group("s.siparis_tarihi")}
            ORDER BY {month_group("s.siparis_tarihi")}
        """, params)
        iade_trend = cursor.fetchall()

        cursor.execute(f"""
                SELECT
                    COALESCE(ma.marka_adi, 'Bilinmiyor') AS name,

                    COUNT(DISTINCT CASE
                        WHEN COALESCE(s.belge_turu_id, 1) = 1
                        THEN s.siparis_id
                    END) AS satis,

                    COUNT(DISTINCT i.iade_id) AS iade,

                    ROUND(
                        COUNT(DISTINCT i.iade_id)
                        / NULLIF(
                            COUNT(DISTINCT CASE
                                WHEN COALESCE(s.belge_turu_id, 1) = 1
                                THEN s.siparis_id
                            END),
                            0
                        ) * 100,
                        2
                    ) AS value

                {joins}
                WHERE {where_sql}
                GROUP BY COALESCE(ma.marka_adi, 'Bilinmiyor')
                HAVING satis > 0
                ORDER BY value DESC
                LIMIT 8
            """, params)
        marka_bazli_iade = cursor.fetchall()

        cursor.execute(f"""
                SELECT
                    COALESCE(ka.kategori_adi, 'Bilinmiyor') AS name,

                    COUNT(DISTINCT CASE
                        WHEN COALESCE(s.belge_turu_id, 1) = 1
                        THEN s.siparis_id
                    END) AS satis,

                    COUNT(DISTINCT i.iade_id) AS iade,

                    ROUND(
                        COUNT(DISTINCT i.iade_id)
                        / NULLIF(
                            COUNT(DISTINCT CASE
                                WHEN COALESCE(s.belge_turu_id, 1) = 1
                                THEN s.siparis_id
                            END),
                            0
                        ) * 100,
                        2
                    ) AS value

                {joins}
                WHERE {where_sql}

                GROUP BY COALESCE(ka.kategori_adi, 'Bilinmiyor')
                HAVING satis > 0

                ORDER BY value DESC
                LIMIT 8
            """, params)

        kategori_bazli_iade = cursor.fetchall()

        cursor.execute(f"""
            SELECT
                {online_case()} AS name,
                COUNT(DISTINCT s.siparis_id) AS value
            {joins}
            WHERE {where_sql}
              AND COALESCE(s.belge_turu_id, 1) = 1
            GROUP BY name
            ORDER BY value DESC
        """, params)
        siparis_kanali_dagilimi = cursor.fetchall()

        cursor.execute(f"""
            SELECT
                {month_expr("s.siparis_tarihi")} AS name,
                ROUND(
                    COALESCE(SUM(COALESCE(su.adet, 0)), 0)
                    / NULLIF(COUNT(DISTINCT s.siparis_id), 0),
                    2
                ) AS value
            {joins}
            WHERE {where_sql}
              AND COALESCE(s.belge_turu_id, 1) = 1
            GROUP BY {month_group("s.siparis_tarihi")}
            ORDER BY {month_group("s.siparis_tarihi")}
        """, params)
        ortalama_urun_sayisi_trend = cursor.fetchall()

        return {
            "kpis": {
                "toplam_siparis": toplam_siparis,
                "toplam_iade": toplam_iade,
                "iade_orani": iade_orani,
                "ortalama_urun_sayisi": safe_float(kpis.get("ortalama_urun_sayisi")),
            },
            "siparis_trend": siparis_trend,
            "satis_iade_karsilastirma": satis_iade_karsilastirma,
            "iade_trend": iade_trend,
            "marka_bazli_iade": marka_bazli_iade,
            "kategori_bazli_iade": kategori_bazli_iade,
            "siparis_kanali_dagilimi": siparis_kanali_dagilimi,
            "ortalama_urun_sayisi_trend": ortalama_urun_sayisi_trend,
        }

    finally:
        cursor.close()
        conn.close()

@app.get("/dashboard/customers")
def dashboard_customers(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    city: str = "Tümü",
    segment: str = "Tümü",
    risk_status: str = "Tümü",
    vip_filter: str = "Tümü",
    customer_type: str = "Tümü",
    amount_mode: str = "reel",
    min_ltv: Optional[float] = None,
    min_frequency: Optional[int] = None,
    last_purchase_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        where = ["m.musteri_id IS NOT NULL"]
        params = []

        if start_date:
            where.append("DATE(COALESCE(ot.ilk_alisveris_tarihi, m.olusturma_tarihi)) >= %s")
            params.append(start_date)

        if end_date:
            where.append("DATE(COALESCE(ot.ilk_alisveris_tarihi, m.olusturma_tarihi)) <= %s")
            params.append(end_date)

        if city != "Tümü":
            where.append("se.sehir_adi = %s")
            params.append(city)

        if segment != "Tümü":
            where.append("COALESCE(r.segment, 'Bilinmiyor') = %s")
            params.append(segment)

        if risk_status == "Riskli":
            where.append("""
                (
                    COALESCE(l.risk_seviyesi, '') = 'Riskli'
                    OR COALESCE(l.churn_olasiligi, 0) >= 0.50
                    OR COALESCE(r.segment, '') IN ('Riskli', 'Uyuyan', 'Kaybedilmiş')
                    OR ot.son_alisveris_tarihi IS NULL
                    OR DATEDIFF(CURDATE(), ot.son_alisveris_tarihi) >= 90
                )
            """)

        if risk_status == "Normal":
            where.append("""
                (
                    COALESCE(l.risk_seviyesi, '') <> 'Riskli'
                    AND COALESCE(l.churn_olasiligi, 0) < 0.50
                    AND COALESCE(r.segment, '') NOT IN ('Riskli', 'Uyuyan', 'Kaybedilmiş')
                    AND ot.son_alisveris_tarihi IS NOT NULL
                    AND DATEDIFF(CURDATE(), ot.son_alisveris_tarihi) < 90
                )
            """)

        if vip_filter == "VIP":
            where.append("COALESCE(l.musteri_yasam_degeri, ot.ltv, 0) >= 5000")

        if vip_filter == "VIP Değil":
            where.append("COALESCE(l.musteri_yasam_degeri, ot.ltv, 0) < 5000")

        if customer_type == "Yeni":
            where.append("COALESCE(ot.siparis_sayisi, 0) <= 1")

        if customer_type == "Geri Dönen":
            where.append("COALESCE(ot.siparis_sayisi, 0) > 1")

        if min_ltv is not None:
            where.append("COALESCE(l.musteri_yasam_degeri, ot.ltv, 0) >= %s")
            params.append(min_ltv)

        if min_frequency is not None:
            where.append("COALESCE(ot.siparis_sayisi, r.alisveris_sikligi, 0) >= %s")
            params.append(min_frequency)

        if last_purchase_date:
            where.append("DATE(ot.son_alisveris_tarihi) >= %s")
            params.append(last_purchase_date)

        where_sql = " AND ".join(where)

        joins = """
            FROM musteriler m

            LEFT JOIN (
                SELECT
                    s.musteri_id,
                    COUNT(DISTINCT s.siparis_id) AS siparis_sayisi,
                    COALESCE(SUM(COALESCE(su.adet, 0) * COALESCE(su.birim_fiyat, 0)), 0) AS ltv,
                    MIN(s.siparis_tarihi) AS ilk_alisveris_tarihi,
                    MAX(s.siparis_tarihi) AS son_alisveris_tarihi,
                    MAX(sb.sehir_id) AS sehir_id
                FROM siparisler s
                LEFT JOIN siparis_urunleri su ON su.siparis_id = s.siparis_id
                LEFT JOIN subeler sb ON sb.sube_id = s.sube_id
                WHERE s.siparis_tarihi IS NOT NULL
                  AND COALESCE(s.belge_turu_id, 1) = 1
                GROUP BY s.musteri_id
            ) ot ON ot.musteri_id = m.musteri_id

            LEFT JOIN sehirler se ON se.sehir_id = ot.sehir_id

            LEFT JOIN (
                SELECT r1.*
                FROM rfm_skorlari r1
                INNER JOIN (
                    SELECT musteri_id, MAX(hesaplama_tarihi) AS son_tarih
                    FROM rfm_skorlari
                    GROUP BY musteri_id
                ) r2 ON r2.musteri_id = r1.musteri_id
                    AND r2.son_tarih = r1.hesaplama_tarihi
            ) r ON r.musteri_id = m.musteri_id

            LEFT JOIN ltv_tahminleri l ON l.musteri_id = m.musteri_id
        """

        ilk_tarih = "COALESCE(ot.ilk_alisveris_tarihi, m.olusturma_tarihi)"
        son_tarih = "COALESCE(ot.son_alisveris_tarihi, m.olusturma_tarihi)"

        ilk_ay_expr = f"DATE_FORMAT({ilk_tarih}, '%Y-%m')"
        son_ay_expr = f"DATE_FORMAT({son_tarih}, '%Y-%m')"

        cursor.execute(f"""
            SELECT
                COUNT(DISTINCT m.musteri_id) AS toplam_musteri,

                COUNT(DISTINCT CASE
                    WHEN COALESCE(l.risk_seviyesi, '') = 'Riskli'
                      OR COALESCE(l.churn_olasiligi, 0) >= 0.50
                      OR COALESCE(r.segment, '') IN ('Riskli', 'Uyuyan', 'Kaybedilmiş')
                      OR ot.son_alisveris_tarihi IS NULL
                      OR DATEDIFF(CURDATE(), ot.son_alisveris_tarihi) >= 90
                    THEN m.musteri_id
                END) AS riskli_musteri,

                ROUND(AVG(COALESCE(l.musteri_yasam_degeri, ot.ltv, 0)), 2) AS ortalama_ltv,

                ROUND(
                    COUNT(DISTINCT CASE WHEN COALESCE(ot.siparis_sayisi, 0) > 1 THEN m.musteri_id END)
                    / NULLIF(COUNT(DISTINCT m.musteri_id), 0) * 100,
                    2
                ) AS tekrar_satin_alma_orani,

                COUNT(DISTINCT CASE WHEN COALESCE(ot.siparis_sayisi, 0) <= 1 THEN m.musteri_id END) AS yeni_musteri

            {joins}
            WHERE {where_sql}
        """, params)
        kpis = cursor.fetchone() or {}

        cursor.execute(f"""
            SELECT
                {ilk_ay_expr} AS name,
                COUNT(DISTINCT CASE WHEN COALESCE(ot.siparis_sayisi, 0) <= 1 THEN m.musteri_id END) AS yeni,
                COUNT(DISTINCT CASE WHEN COALESCE(ot.siparis_sayisi, 0) > 1 THEN m.musteri_id END) AS geri_donen
            {joins}
            WHERE {where_sql}
            GROUP BY {ilk_ay_expr}
            ORDER BY {ilk_ay_expr}
        """, params)
        yeni_vs_geri_donen = cursor.fetchall()

        cursor.execute(f"""
            SELECT
                {ilk_ay_expr} AS cohort,
                COUNT(DISTINCT m.musteri_id) AS toplam,
                COUNT(DISTINCT CASE WHEN COALESCE(ot.siparis_sayisi, 0) > 1 THEN m.musteri_id END) AS tekrar_eden,
                ROUND(
                    COUNT(DISTINCT CASE WHEN COALESCE(ot.siparis_sayisi, 0) > 1 THEN m.musteri_id END)
                    / NULLIF(COUNT(DISTINCT m.musteri_id), 0) * 100,
                    2
                ) AS retention
            {joins}
            WHERE {where_sql}
            GROUP BY {ilk_ay_expr}
            ORDER BY {ilk_ay_expr}
            LIMIT 12
        """, params)
        cohort_analizi = cursor.fetchall()

        cursor.execute(f"""
            SELECT 'Yeni' AS name,
                   COUNT(DISTINCT CASE WHEN COALESCE(ot.siparis_sayisi, 0) <= 1 THEN m.musteri_id END) AS value
            {joins}
            WHERE {where_sql}

            UNION ALL

            SELECT 'Aktif' AS name,
                   COUNT(DISTINCT CASE WHEN ot.son_alisveris_tarihi IS NOT NULL AND DATEDIFF(CURDATE(), ot.son_alisveris_tarihi) < 90 THEN m.musteri_id END) AS value
            {joins}
            WHERE {where_sql}

            UNION ALL

            SELECT 'Sadık' AS name,
                   COUNT(DISTINCT CASE WHEN COALESCE(ot.siparis_sayisi, 0) >= 3 THEN m.musteri_id END) AS value
            {joins}
            WHERE {where_sql}

            UNION ALL

            SELECT 'Riskli' AS name,
                   COUNT(DISTINCT CASE WHEN ot.son_alisveris_tarihi IS NULL OR DATEDIFF(CURDATE(), ot.son_alisveris_tarihi) >= 90 THEN m.musteri_id END) AS value
            {joins}
            WHERE {where_sql}
        """, params * 4)

        funnel_rows = cursor.fetchall()
        max_funnel = max([safe_float(x.get("value")) for x in funnel_rows], default=0)

        musteri_yasam_dongusu = [
            {
                "name": row["name"],
                "value": safe_int(row["value"]),
                "percent": round((safe_float(row["value"]) / max_funnel) * 100, 2) if max_funnel else 0
            }
            for row in funnel_rows
        ]

        cursor.execute(f"""
            SELECT
                {son_ay_expr} AS name,
                COUNT(DISTINCT CASE
                    WHEN ot.son_alisveris_tarihi IS NULL
                      OR DATEDIFF(CURDATE(), ot.son_alisveris_tarihi) >= 90
                      OR COALESCE(l.churn_olasiligi, 0) >= 0.50
                    THEN m.musteri_id
                END) AS riskli
            {joins}
            WHERE {where_sql}
            GROUP BY {son_ay_expr}
            ORDER BY {son_ay_expr}
        """, params)
        churn_trend = cursor.fetchall()

        cursor.execute(f"""
            SELECT
                COALESCE(se.sehir_adi, 'Şehir Bilgisi Yok') AS name,
                COUNT(DISTINCT m.musteri_id) AS value
            {joins}
            WHERE {where_sql}
            GROUP BY COALESCE(se.sehir_adi, 'Şehir Bilgisi Yok')
            ORDER BY value DESC
            LIMIT 10
        """, params)
        sehir_bazli_musteri = cursor.fetchall()

        cursor.execute(f"""
            SELECT
                COALESCE(r.segment, 'Bilinmiyor') AS name,
                COUNT(DISTINCT m.musteri_id) AS value
            {joins}
            WHERE {where_sql}
            GROUP BY COALESCE(r.segment, 'Bilinmiyor')
            ORDER BY value DESC
            LIMIT 10
        """, params)
        segment_dagilimi = cursor.fetchall()

        cursor.execute(f"""
            SELECT
                CASE
                    WHEN COALESCE(ot.siparis_sayisi, 0) = 0 THEN '0 alışveriş'
                    WHEN COALESCE(ot.siparis_sayisi, 0) = 1 THEN '1 alışveriş'
                    WHEN COALESCE(ot.siparis_sayisi, 0) BETWEEN 2 AND 3 THEN '2-3 alışveriş'
                    WHEN COALESCE(ot.siparis_sayisi, 0) BETWEEN 4 AND 6 THEN '4-6 alışveriş'
                    ELSE '7+ alışveriş'
                END AS name,
                COUNT(DISTINCT m.musteri_id) AS value
            {joins}
            WHERE {where_sql}
            GROUP BY
                CASE
                    WHEN COALESCE(ot.siparis_sayisi, 0) = 0 THEN '0 alışveriş'
                    WHEN COALESCE(ot.siparis_sayisi, 0) = 1 THEN '1 alışveriş'
                    WHEN COALESCE(ot.siparis_sayisi, 0) BETWEEN 2 AND 3 THEN '2-3 alışveriş'
                    WHEN COALESCE(ot.siparis_sayisi, 0) BETWEEN 4 AND 6 THEN '4-6 alışveriş'
                    ELSE '7+ alışveriş'
                END
            ORDER BY value DESC
        """, params)
        satin_alma_frekansi = cursor.fetchall()

        cursor.execute(f"""
            SELECT
                {ilk_ay_expr} AS name,
                ROUND(AVG(COALESCE(l.musteri_yasam_degeri, ot.ltv, 0)), 2) AS value
            {joins}
            WHERE {where_sql}
            GROUP BY {ilk_ay_expr}
            ORDER BY {ilk_ay_expr}
        """, params)
        ortalama_ltv_trend = cursor.fetchall()

        cursor.execute(f"""
            SELECT
                'Müşteri' AS name,
                COUNT(DISTINCT CASE
                    WHEN ot.son_alisveris_tarihi IS NOT NULL
                     AND DATEDIFF(CURDATE(), ot.son_alisveris_tarihi) < 90
                     AND COALESCE(l.churn_olasiligi, 0) < 0.50
                    THEN m.musteri_id
                END) AS aktif,
                COUNT(DISTINCT CASE
                    WHEN ot.son_alisveris_tarihi IS NULL
                      OR DATEDIFF(CURDATE(), ot.son_alisveris_tarihi) >= 90
                      OR COALESCE(l.churn_olasiligi, 0) >= 0.50
                    THEN m.musteri_id
                END) AS riskli
            {joins}
            WHERE {where_sql}
        """, params)
        riskli_vs_aktif = cursor.fetchall()

        cursor.execute(f"""
            SELECT
                CASE
                    WHEN COALESCE(ot.siparis_sayisi, 0) = 0 THEN 'Kayıt'
                    WHEN COALESCE(ot.siparis_sayisi, 0) = 1 THEN 'Yeni Alışveriş'
                    WHEN COALESCE(ot.siparis_sayisi, 0) > 1 THEN 'Geri Dönen'
                    ELSE 'Bilinmiyor'
                END AS name,
                COUNT(DISTINCT m.musteri_id) AS value
            {joins}
            WHERE {where_sql}
            GROUP BY
                CASE
                    WHEN COALESCE(ot.siparis_sayisi, 0) = 0 THEN 'Kayıt'
                    WHEN COALESCE(ot.siparis_sayisi, 0) = 1 THEN 'Yeni Alışveriş'
                    WHEN COALESCE(ot.siparis_sayisi, 0) > 1 THEN 'Geri Dönen'
                    ELSE 'Bilinmiyor'
                END
            ORDER BY value DESC
        """, params)
        musteri_kazanim_kaynagi = cursor.fetchall()

        return {
            "kpis": {
                "toplam_musteri": safe_int(kpis.get("toplam_musteri")),
                "riskli_musteri": safe_int(kpis.get("riskli_musteri")),
                "ortalama_ltv": safe_float(kpis.get("ortalama_ltv")),
                "tekrar_satin_alma_orani": safe_float(kpis.get("tekrar_satin_alma_orani")),
                "yeni_musteri": safe_int(kpis.get("yeni_musteri")),
            },
            "yeni_vs_geri_donen": yeni_vs_geri_donen,
            "cohort_analizi": cohort_analizi,
            "musteri_yasam_dongusu": musteri_yasam_dongusu,
            "churn_trend": churn_trend,
            "sehir_bazli_musteri": sehir_bazli_musteri,
            "segment_dagilimi": segment_dagilimi,
            "satin_alma_frekansi": satin_alma_frekansi,
            "ortalama_ltv_trend": ortalama_ltv_trend,
            "riskli_vs_aktif": riskli_vs_aktif,
            "musteri_kazanim_kaynagi": musteri_kazanim_kaynagi,
        }

    finally:
        cursor.close()
        conn.close()