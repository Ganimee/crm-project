'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  User,
  Lock,
  ChevronRight,
  AlertCircle,
  ShieldCheck,
  Sun,
  Moon,
  Database,
  BarChart3,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTheme } from './context/ThemeContext';

export default function LoginPage() {
  const { isDarkMode, toggleTheme } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  const router = useRouter();
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const styles = getStyles(isDarkMode);

  useEffect(() => {
    const handleMouseMove = (e) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let lastLineSpawn = 0;
    let lastBallSpawn = 0;

    const lines = [];
    const balls = [];

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const spawnLine = () => {
      lines.push({
        x: -220,
        y: Math.random() * canvas.height,
        length: Math.random() * 320 + 220,
        speed: Math.random() * 1.8 + 1,
        opacity: Math.random() * 0.18 + 0.08,
        width: Math.random() * 1.4 + 0.5,
      });
    };

    const spawnBall = () => {
      balls.push({
        x: -90,
        y: Math.random() * canvas.height,
        radius: Math.random() * 24 + 18,
        speedX: Math.random() * 1.4 + 0.8,
        speedY: (Math.random() - 0.5) * 0.45,
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() * 0.018 + 0.006) * (Math.random() > 0.5 ? 1 : -1),
        opacity: Math.random() * 0.22 + 0.1,
      });
    };

    const drawBall = (ball) => {
      ctx.save();
      ctx.translate(ball.x, ball.y);
      ctx.rotate(ball.rotation);

      ctx.strokeStyle = isDarkMode
        ? `rgba(239,68,68,${ball.opacity})`
        : `rgba(185,28,28,${ball.opacity * 0.85})`;
      ctx.fillStyle = isDarkMode
        ? `rgba(20,4,4,${ball.opacity * 0.35})`
        : `rgba(255,235,235,${ball.opacity * 0.8})`;

      ctx.lineWidth = 1.7;
      ctx.shadowBlur = isDarkMode ? 16 : 7;
      ctx.shadowColor = 'rgba(239,68,68,0.9)';

      ctx.beginPath();
      ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-ball.radius, 0);
      ctx.lineTo(ball.radius, 0);
      ctx.moveTo(0, -ball.radius);
      ctx.lineTo(0, ball.radius);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(-ball.radius * 1.15, 0, ball.radius * 0.85, -Math.PI / 3, Math.PI / 3);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(ball.radius * 1.15, 0, ball.radius * 0.85, Math.PI - Math.PI / 3, Math.PI + Math.PI / 3);
      ctx.stroke();

      ctx.restore();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const animate = (time) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const mouse = mouseRef.current;

      const cursorGlow = ctx.createRadialGradient(
        mouse.x,
        mouse.y,
        0,
        mouse.x,
        mouse.y,
        260
      );

      cursorGlow.addColorStop(
        0,
        isDarkMode ? 'rgba(239,68,68,0.24)' : 'rgba(239,68,68,0.20)'
      );
      cursorGlow.addColorStop(
        0.45,
        isDarkMode ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.07)'
      );
      cursorGlow.addColorStop(1, 'rgba(239,68,68,0)');

      ctx.fillStyle = cursorGlow;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (time - lastLineSpawn > 900) {
        spawnLine();
        lastLineSpawn = time;
      }

      if (time - lastBallSpawn > 2200) {
        spawnBall();
        lastBallSpawn = time;
      }

      lines.forEach((line, index) => {
        ctx.strokeStyle = isDarkMode
          ? `rgba(239,68,68,${line.opacity})`
          : `rgba(220,38,38,${line.opacity * 0.85})`;

        ctx.lineWidth = line.width;
        ctx.shadowBlur = isDarkMode ? 13 : 4;
        ctx.shadowColor = 'rgba(239,68,68,0.9)';

        ctx.beginPath();
        ctx.moveTo(line.x, line.y);
        ctx.lineTo(line.x + line.length, line.y + line.length * 0.28);
        ctx.stroke();

        line.x += line.speed;

        if (line.x > canvas.width + line.length) {
          lines.splice(index, 1);
        }
      });

      balls.forEach((ball, index) => {
        drawBall(ball);

        ball.x += ball.speedX;
        ball.y += ball.speedY;
        ball.rotation += ball.spin;

        if (ball.x - ball.radius > canvas.width + 90) {
          balls.splice(index, 1);
        }
      });

      ctx.shadowBlur = 0;
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isDarkMode]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setIsError(false);

    try {
      const res = await fetch('http://127.0.0.1:8000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eposta: email, sifre: password }),
      });

      if (!res.ok) throw new Error('Login failed');

      const data = await res.json();

      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('permissions', JSON.stringify(data.user.permissions));

      console.log('Giriş başarılı', data);
      router.push('/dashboard');
    } catch (err) {
      console.log(err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main style={styles.page}>
      <style jsx global>{`
        @keyframes bgFloatOne {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(45px, 35px) scale(1.08); }
        }

        @keyframes bgFloatTwo {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-35px, -30px) scale(1.1); }
        }

        @keyframes loginUp {
          from { opacity: 0; transform: translateY(35px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes logoGlow {
          0%, 100% { filter: drop-shadow(0 0 12px rgba(239, 68, 68, 0.45)); }
          50% { filter: drop-shadow(0 0 32px rgba(239, 68, 68, 0.95)); }
        }

        @keyframes spinSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes loadingSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes errorIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes shine {
          0% { transform: translateX(-140%); }
          100% { transform: translateX(140%); }
        }
      `}</style>

      <div style={styles.backgroundLayer}>
        <div style={styles.bgPhoto} />
        <div style={styles.bgOverlay} />
        <div style={styles.bgVignette} />
        <div style={styles.gridDots} />
        <div style={styles.glowOne} />
        <div style={styles.glowTwo} />
        <div style={styles.glowThree} />
        <canvas ref={canvasRef} style={styles.canvas} />
      </div>

      <button
        onClick={toggleTheme}
        title="Temayı Değiştir"
        style={styles.themeButton}
      >
        {isDarkMode ? <Sun size={20} style={styles.sunIcon} /> : <Moon size={20} />}
      </button>

      <div style={styles.centerBox}>
        <div style={styles.logoArea}>
          <div style={styles.logoWrapper}>
            <img
              src={isDarkMode ? '/logo_dark.png' : '/logo.png'}
              alt="Sporthink Logo"
              style={styles.logo}
            />
          </div>

          <div style={styles.panelLine}>
            <div style={styles.line} />
            <h2 style={styles.panelText}>Yönetici Paneli</h2>
            <div style={styles.line} />
          </div>
        </div>

        <div style={styles.cardOuter}>
          <div style={styles.card}>
            <div style={styles.cardLight} />

            <form onSubmit={handleLogin} style={styles.form}>
              <div style={styles.inputGroup}>
                <User size={20} style={styles.inputIcon} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="E-posta Adresi"
                  required
                  style={styles.input}
                />
              </div>

              <div>
                <div style={styles.inputGroup}>
                  <Lock size={20} style={styles.inputIcon} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Şifre"
                    required
                    style={styles.input}
                  />
                </div>

                <div style={styles.forgotArea}>
                  <button
                    type="button"
                    onClick={() => router.push('/sifre-unuttum')}
                    style={styles.forgotButton}
                  >
                    Şifremi Unuttum
                  </button>
                </div>
              </div>

              {isError && (
                <div style={styles.errorBox}>
                  <AlertCircle size={14} />
                  Giriş yapılamadı. Bilgilerinizi kontrol edin.
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  ...styles.loginButton,
                  opacity: isLoading ? 0.45 : 1,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                }}
              >
                <span style={styles.buttonShine} />

                {isLoading ? (
                  <div style={styles.spinner} />
                ) : (
                  <>
                    <span style={styles.loginButtonText}>Giriş Yap</span>
                    <ChevronRight size={18} />
                  </>
                )}
              </button>
            </form>

            <div style={styles.secureInfo}>
              <ShieldCheck
                size={14}
                color={isDarkMode ? 'rgba(248,113,113,0.45)' : 'rgba(239,68,68,0.65)'}
              />
              <span style={styles.secureText}>Güvenli Oturum</span>
            </div>
          </div>
        </div>

        <div style={styles.infoCards}>
          <InfoCard styles={styles} icon={<ShieldCheck size={21} color="#ef4444" />} title="Güvenli" />
          <InfoCard styles={styles} icon={<Database size={21} color="#ef4444" />} title="Veri Koruma" />
          <InfoCard styles={styles} icon={<BarChart3 size={21} color="#ef4444" />} title="CRM Analiz" />
        </div>

        <div style={styles.platform}>
          <p style={styles.platformText}>
            Sporthink Veri Analitiği • CRM Platformu
          </p>

          <div style={styles.serverStatus}>
            <div style={styles.greenDot} />
            <span style={styles.serverText}>Sunucular Aktif</span>
          </div>
        </div>
      </div>
    </main>
  );
}

function InfoCard({ styles, icon, title }) {
  return (
    <div
      style={styles.infoCard}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-5px)';
        e.currentTarget.style.borderColor = 'rgba(239,68,68,0.55)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = styles.infoCard.borderColor;
      }}
    >
      {icon}
      <span style={styles.infoCardText}>{title}</span>
    </div>
  );
}

function getStyles(isDarkMode) {
  return {
    page: {
      minHeight: '100vh',
      width: '100%',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      fontFamily:
        'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      background: isDarkMode ? '#050505' : '#fff7f8',
      color: isDarkMode ? '#ffffff' : '#171717',
      transition: 'all 0.7s ease',
    },

    backgroundLayer: {
      position: 'absolute',
      inset: 0,
      overflow: 'hidden',
      pointerEvents: 'none',
      zIndex: 0,
    },

    canvas: {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      zIndex: 6,
      opacity: isDarkMode ? 0.95 : 0.65,
      pointerEvents: 'none',
    },

    bgPhoto: {
      position: 'absolute',
      inset: 0,
      backgroundImage: `url(${
  isDarkMode
    ? '/login.png'
    : '/login-aydın.png'
})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      opacity: isDarkMode ? 0.75 : 0.90,
      filter: isDarkMode
        ? 'contrast(1.25) brightness(0.62) saturate(1.25)'
        : 'contrast(1.1) brightness(1.1) saturate(1.25)',
      transform: 'scale(1.06)',
    },

 bgOverlay: {
  position: 'absolute',
  inset: 0,
  zIndex: 2,
  background: isDarkMode
    ? 'linear-gradient(135deg, rgba(0,0,0,0.78), rgba(0,0,0,0.35), rgba(127,29,29,0.18))'
    : 'linear-gradient(135deg, rgba(255,245,245,0.12), rgba(255,240,240,0.06), rgba(254,202,202,0.10))',
},
    bgVignette: {
  position: 'absolute',
  inset: 0,
  zIndex: 3,
  background: isDarkMode
    ? 'radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.94) 88%)'
    : 'radial-gradient(circle at center, transparent 0%, rgba(255,245,245,0.22) 82%)',
},

    gridDots: {
      position: 'absolute',
      inset: 0,
      zIndex: 4,
      opacity: 0.05,
      backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
      backgroundSize: '30px 30px',
      filter: isDarkMode
  ? 'contrast(1.35) brightness(0.82) saturate(1.45)'
  : 'contrast(1.08) brightness(1.02) saturate(1.18)',
    },

    glowOne: {
      position: 'absolute',
      zIndex: 5,
      top: '-12%',
      left: '-10%',
      width: 520,
      height: 520,
      borderRadius: '50%',
      background: isDarkMode
        ? 'rgba(127,29,29,0.36)'
        : 'rgba(252,165,165,0.45)',
      filter: 'blur(130px)',
      animation: 'bgFloatOne 9s ease-in-out infinite',
    },

    glowTwo: {
      position: 'absolute',
      zIndex: 5,
      bottom: '-14%',
      right: '-12%',
      width: 480,
      height: 480,
      borderRadius: '50%',
      background: isDarkMode
        ? 'rgba(190,18,60,0.25)'
        : 'rgba(254,205,211,0.65)',
      filter: 'blur(130px)',
      animation: 'bgFloatTwo 11s ease-in-out infinite',
    },

    glowThree: {
      position: 'absolute',
      zIndex: 5,
      top: '36%',
      right: '20%',
      width: 260,
      height: 260,
      borderRadius: '50%',
      background: isDarkMode
        ? 'rgba(239,68,68,0.15)'
        : 'rgba(248,113,113,0.2)',
      filter: 'blur(100px)',
      animation: 'bgFloatOne 7s ease-in-out infinite',
    },

    themeButton: {
      position: 'absolute',
      top: 32,
      right: 32,
      zIndex: 50,
      width: 48,
      height: 48,
      borderRadius: 18,
      border: isDarkMode
        ? '1px solid rgba(39,39,42,1)'
        : '1px solid rgba(254,202,202,1)',
      background: isDarkMode
        ? 'rgba(24,24,27,0.72)'
        : 'rgba(255,255,255,0.82)',
      color: isDarkMode ? '#facc15' : '#b91c1c',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: isDarkMode
        ? '0 0 25px rgba(239,68,68,0.35)'
        : '0 0 25px rgba(239,68,68,0.25)',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
    },

    sunIcon: {
      animation: 'spinSlow 8s linear infinite',
    },

    centerBox: {
      width: '100%',
      maxWidth: 590,
      position: 'relative',
      zIndex: 10,
      animation: 'loginUp 0.9s ease-out both',
    },

    logoArea: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      marginBottom: 40,
    },

    logoWrapper: {
      marginBottom: 24,
      transition: 'all 0.5s ease',
      filter: isDarkMode
        ? 'drop-shadow(0 0 35px rgba(239,68,68,0.85))'
        : 'drop-shadow(0 0 25px rgba(239,68,68,0.45))',
    },

    logo: {
      width: 230,
      objectFit: 'contain',
      animation: 'logoGlow 2.8s ease-in-out infinite',
    },

    panelLine: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      width: '100%',
      maxWidth: 240,
    },

    line: {
      height: 1,
      flex: 1,
      background: 'linear-gradient(90deg, transparent, #ef4444, #dc2626)',
      boxShadow: '0 0 12px rgba(239,68,68,0.8)',
    },

    panelText: {
      margin: 0,
      fontSize: 9,
      textTransform: 'uppercase',
      letterSpacing: '0.35em',
      whiteSpace: 'nowrap',
      fontWeight: 900,
      color: isDarkMode ? 'rgba(254,226,226,0.72)' : '#b91c1c',
    },

    cardOuter: {
      position: 'relative',
      padding: 1,
      borderRadius: 40,
      overflow: 'hidden',
      background: isDarkMode
        ? 'linear-gradient(135deg, rgba(239,68,68,0.32), rgba(39,39,42,0.45), transparent)'
        : 'linear-gradient(135deg, #fecaca, #ffffff, #fee2e2)',
      transition: 'all 0.5s ease',
    },

    card: {
      position: 'relative',
      padding: 70,
      borderRadius: 39,
      overflow: 'hidden',
      border: isDarkMode
        ? '1px solid rgba(239,68,68,0.2)'
        : '1px solid rgba(254,202,202,1)',
      background: isDarkMode ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.92)',
      backdropFilter: 'blur(24px)',
      boxShadow: isDarkMode
        ? '0 0 65px rgba(239,68,68,0.28)'
        : '0 25px 70px rgba(239,68,68,0.22)',
    },

    cardLight: {
      position: 'absolute',
      top: -96,
      left: -96,
      width: 224,
      height: 224,
      background: isDarkMode
        ? 'rgba(220,38,38,0.16)'
        : 'rgba(239,68,68,0.15)',
      filter: 'blur(70px)',
      pointerEvents: 'none',
    },

    form: {
      display: 'flex',
      flexDirection: 'column',
      gap: 28,
      position: 'relative',
      zIndex: 10,
    },

    inputGroup: {
      position: 'relative',
    },

    inputIcon: {
      position: 'absolute',
      left: 16,
      top: '50%',
      transform: 'translateY(-50%)',
      color: isDarkMode ? 'rgba(255,255,255,0.28)' : '#f87171',
      pointerEvents: 'none',
      color: '#ef4444',
    },

    input: {
      width: '100%',
      boxSizing: 'border-box',
      borderRadius: 16,
      padding: '20px 20px 20px 56px',
      outline: 'none',
      border: isDarkMode
        ? '1px solid rgba(39,39,42,1)'
        : '1px solid rgba(254,202,202,1)',
      background: isDarkMode
        ? 'rgba(24,24,27,0.62)'
        : 'rgba(255,255,255,0.78)',
      color: isDarkMode ? '#ffffff' : '#171717',
      fontSize: 14,
      fontWeight: 600,
      transition: 'all 0.3s ease',
      boxShadow: isDarkMode
        ? '0 0 18px rgba(239,68,68,0.12)'
        : 'inset 0 1px 8px rgba(0,0,0,0.04)',
    },

    forgotArea: {
      display: 'flex',
      justifyContent: 'flex-end',
      padding: '8px 4px 0',
    },

    forgotButton: {
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
      color: isDarkMode ? 'rgba(255,255,255,0.45)' : '#737373',
      fontSize: 11,
      fontWeight: 800,
      letterSpacing: '-0.01em',
    },

    errorBox: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: 12,
      borderRadius: 12,
      fontSize: 11,
      fontWeight: 800,
      border: isDarkMode
        ? '1px solid rgba(220,38,38,0.35)'
        : '1px solid rgba(254,202,202,1)',
      color: isDarkMode ? '#f87171' : '#dc2626',
      background: isDarkMode ? 'rgba(220,38,38,0.1)' : '#fef2f2',
      boxShadow: isDarkMode ? '0 0 18px rgba(239,68,68,0.25)' : 'none',
      animation: 'errorIn 0.25s ease-out both',
    },

    loginButton: {
      position: 'relative',
      overflow: 'hidden',
      width: '100%',
      border: '1px solid rgba(252,165,165,0.22)',
      borderRadius: 19,
      padding: '16px 18px',
      background: 'linear-gradient(90deg, #dc2626, #e11d48, #b91c1c)',
      color: '#ffffff',
      fontWeight: 900,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      marginTop: 14,
      boxShadow: '0 0 40px rgba(239,68,68,0.55)',
      transition: 'all 0.3s ease',
    },

    buttonShine: {
      position: 'absolute',
      inset: 0,
      background:
        'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)',
      animation: 'shine 2.8s ease-in-out infinite',
    },

    loginButtonText: {
      position: 'relative',
      zIndex: 2,
      fontSize: 12,
      letterSpacing: '0.2em',
      textTransform: 'uppercase',
    },

    spinner: {
      width: 20,
      height: 20,
      borderRadius: '50%',
      border: '2px solid rgba(255,255,255,0.35)',
      borderTopColor: '#ffffff',
      animation: 'loadingSpin 0.8s linear infinite',
      position: 'relative',
      zIndex: 2,
    },

    secureInfo: {
      marginTop: 40,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      position: 'relative',
      zIndex: 10,
    },

    secureText: {
      fontSize: 8,
      textTransform: 'uppercase',
      letterSpacing: '0.4em',
      fontWeight: 900,
      color: isDarkMode ? 'rgba(255,255,255,0.22)' : '#d4d4d4',
    },

    infoCards: {
      marginTop: 28,
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 12,
    },

    infoCard: {
      padding: 16,
      minHeight: 74,
      borderRadius: 18,
      borderColor: isDarkMode
        ? 'rgba(39,39,42,0.9)'
        : 'rgba(254,202,202,1)',
      borderStyle: 'solid',
      borderWidth: 1,
      background: isDarkMode
        ? 'rgba(0,0,0,0.45)'
        : 'rgba(255,255,255,0.82)',
      backdropFilter: 'blur(16px)',
      boxShadow: isDarkMode
        ? '0 0 25px rgba(239,68,68,0.08)'
        : '0 15px 35px rgba(239,68,68,0.10)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      textAlign: 'center',
      transition: 'all 0.3s ease',
    },

    infoCardText: {
      fontSize: 9,
      fontWeight: 900,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: isDarkMode ? '#ffffff' : '#171717',
    },

    platform: {
      marginTop: 32,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 8,
    },

    platformText: {
      margin: 0,
      fontSize: 9,
      textAlign: 'center',
      textTransform: 'uppercase',
      letterSpacing: '0.5em',
      fontWeight: 800,
      color: isDarkMode
        ? 'rgba(255,255,255,0.22)'
        : 'rgba(185,28,28,0.55)',
    },

    serverStatus: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      opacity: 0.7,
    },

    greenDot: {
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: '#22c55e',
      boxShadow: '0 0 10px rgba(34,197,94,0.8)',
    },

    serverText: {
      fontSize: 9,
      fontWeight: 800,
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
      color: isDarkMode ? '#71717a' : '#a3a3a3',
    },
  };
}