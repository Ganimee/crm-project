'use client';

import React, { useState, useEffect } from 'react';
import {
  Lock,
  Eye,
  EyeOff,
  ChevronRight,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Sun,
  Moon,
  ShieldCheck,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTheme } from '../context/ThemeContext';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const { isDarkMode, toggleTheme } = useTheme();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [status, setStatus] = useState({ type: null, message: '' });
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const rules = [
    { label: 'En az 8 karakter', valid: password.length >= 8 },
    { label: 'Büyük harf', valid: /[A-Z]/.test(password) },
    { label: 'Rakam', valid: /[0-9]/.test(password) },
    { label: 'Özel karakter', valid: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
    { label: 'Şifreler eşleşiyor', valid: password !== '' && password === confirmPassword },
  ];

  const allRulesMet = rules.every((rule) => rule.valid);

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!token) {
      setStatus({
        type: 'error',
        message: 'Şifre sıfırlama bağlantısı geçersiz veya eksik.',
      });
      return;
    }

    if (!allRulesMet) return;

    setIsLoading(true);
    setStatus({ type: null, message: '' });

    try {
      const res = await fetch('http://127.0.0.1:8000/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          yeni_sifre: password,
        }),
      });

      if (!res.ok) {
        throw new Error('Şifre güncellenemedi');
      }

      setIsSuccess(true);
    } catch (err) {
      setStatus({
        type: 'error',
        message: 'Şifre güncellenirken hata oluştu. Link süresi dolmuş olabilir.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className={`reset-page ${isDarkMode ? 'dark' : 'light'}`}>
      <button
        onClick={toggleTheme}
        title="Temayı Değiştir"
        className="theme-button"
      >
        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <div className="effect-layer">
        <div className="glow glow-one" />
        <div className="glow glow-two" />

        <div
          className="mouse-glow"
          style={{
            transform: `translate(${mousePos.x * 3}px, ${mousePos.y * 3}px)`,
          }}
        />

        <div className="dot-pattern" />
      </div>

      <div className="background-layer">
        <div className="background-image" />
        <div className="background-gradient" />
        <div className="background-vignette" />
      </div>

      <section className="reset-container">
        <div className="logo-section">
          <div className="logo-wrapper">
            <img
              src={isDarkMode ? '/logo_dark.png' : '/logo.png'}
              alt="Sporthink Logo"
              className="logo-image"
            />
          </div>

          <div className="title-divider">
            <div />
            <h2>{isSuccess ? 'ŞİFRE GÜNCELLENDİ' : 'YENİ ŞİFRE BELİRLE'}</h2>
            <div />
          </div>
        </div>

        <div className="card-border">
          <div className="card-spin" />

          <div className="reset-card">
            <div className="card-hover" />

            {isSuccess ? (
              <div className="success-box">
                <div className="success-icon">
                  <CheckCircle2 size={40} />
                </div>

                <h3>Şifreniz Güncellendi</h3>

                <p>
                  Artık yeni şifrenizle CRM platformuna giriş yapabilirsiniz.
                </p>

                <button
                  type="button"
                  onClick={() => router.push('/')}
                  className="back-link"
                >
                  <ArrowLeft size={15} />
                  Giriş Ekranına Dön
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="reset-form">
                <div className="info-text">
                  <ShieldCheck size={16} />
                  <p>Güvenliğiniz için güçlü bir şifre belirleyin.</p>
                </div>

                <div className="input-list">
                  <div className="input-box">
                    <Lock size={20} className="input-icon" />

                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Yeni Şifre"
                      required
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="eye-button"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  <div className="input-box">
                    <Lock size={20} className="input-icon" />

                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Şifreyi Onayla"
                      required
                    />
                  </div>
                </div>

                <div className="rules-list">
                  {rules.map((rule, index) => (
                    <div key={index} className="rule-item">
                      {rule.valid ? (
                        <CheckCircle2 size={16} className="rule-valid-icon" />
                      ) : (
                        <XCircle size={16} className="rule-invalid-icon" />
                      )}

                      <span className={rule.valid ? 'rule-valid-text' : ''}>
                        {rule.label}
                      </span>
                    </div>
                  ))}
                </div>

                {status.type === 'error' && (
                  <div className="error-box">
                    {status.message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!allRulesMet || isLoading}
                  className={`submit-button ${allRulesMet ? 'active' : 'passive'}`}
                >
                  <span className="button-shine" />

                  {isLoading ? (
                    <div className="loading-circle" />
                  ) : (
                    <>
                      <span>Şifreyi Güncelle</span>
                      <ChevronRight size={18} />
                    </>
                  )}
                </button>

                <div className="bottom-link-area">
                  <button
                    type="button"
                    onClick={() => router.push('/')}
                    className="back-link"
                  >
                    <ArrowLeft size={15} />
                    Giriş Ekranına Dön
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        <footer className="footer-text">
          Sporthink Veri Analitiği • CRM Platformu
        </footer>
      </section>

      <style jsx global>{`
        .reset-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          font-family: sans-serif;
          position: relative;
          overflow: hidden;
          transition: 0.7s ease;
        }

        .reset-page.dark {
          background: #050505;
          color: white;
        }

        .reset-page.light {
          background: #fff7f8;
          color: #171717;
        }

        .theme-button {
          position: absolute;
          top: 32px;
          right: 32px;
          z-index: 50;
          width: 48px;
          height: 48px;
          border-radius: 16px;
          border: 1px solid;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: 0.3s ease;
        }

        .dark .theme-button {
          background: rgba(24, 24, 27, 0.6);
          color: #facc15;
          border-color: #27272a;
          box-shadow: 0 0 25px rgba(239, 68, 68, 0.35);
        }

        .light .theme-button {
          background: rgba(255, 255, 255, 0.8);
          color: #b91c1c;
          border-color: #fee2e2;
          box-shadow: 0 0 25px rgba(239, 68, 68, 0.25);
        }

        .theme-button:hover {
          transform: scale(1.1);
        }

        .effect-layer,
        .background-layer {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          z-index: 0;
        }

        .glow {
          position: absolute;
          border-radius: 999px;
          filter: blur(130px);
        }

        .glow-one {
          top: -12%;
          left: -10%;
          width: 520px;
          height: 520px;
          animation: energy-one 9s ease-in-out infinite;
        }

        .glow-two {
          bottom: -14%;
          right: -12%;
          width: 480px;
          height: 480px;
          animation: energy-two 11s ease-in-out infinite;
        }

        .dark .glow-one {
          background: rgba(127, 29, 29, 0.35);
        }

        .dark .glow-two {
          background: rgba(190, 18, 60, 0.25);
        }

        .light .glow-one {
          background: rgba(252, 165, 165, 0.45);
        }

        .light .glow-two {
          background: rgba(254, 205, 211, 0.6);
        }

        .mouse-glow {
          position: absolute;
          top: 20%;
          left: 18%;
          width: 600px;
          height: 600px;
          background: rgba(220, 38, 38, 0.1);
          filter: blur(140px);
          border-radius: 999px;
          transition: transform 1s ease-out;
        }

        .dot-pattern {
          position: absolute;
          inset: 0;
          opacity: 0.04;
          background-image: radial-gradient(#ffffff 1px, transparent 1px);
          background-size: 30px 30px;
        }

        .light .dot-pattern {
          filter: invert(1);
        }

        .background-image {
          position: absolute;
          inset: 0;
          background-image: url('/login-bg.jpg');
          background-size: cover;
          background-position: center;
          transform: scale(1.05);
          animation: pulse-slow 15s ease-in-out infinite;
          transition: 1s ease;
        }

        .dark .background-image {
          opacity: 0.28;
          filter: contrast(1.25) brightness(0.65) saturate(1.25);
        }

        .light .background-image {
          opacity: 0.42;
          filter: contrast(1.1) brightness(1.1) saturate(1.25);
        }

        .background-gradient {
          position: absolute;
          inset: 0;
        }

        .dark .background-gradient {
          background: linear-gradient(
            to top right,
            black,
            rgba(0, 0, 0, 0.5),
            rgba(69, 10, 10, 0.3)
          );
        }

        .light .background-gradient {
          background: linear-gradient(
            to top right,
            rgba(255, 255, 255, 0.7),
            transparent,
            rgba(254, 226, 226, 0.4)
          );
        }

        .background-vignette {
          position: absolute;
          inset: 0;
        }

        .dark .background-vignette {
          background: radial-gradient(circle at center, transparent 0%, black 88%);
        }

        .light .background-vignette {
          background: radial-gradient(circle at center, transparent 0%, white 72%);
        }

        .reset-container {
          width: 100%;
          max-width: 440px;
          position: relative;
          z-index: 10;
          animation: login 0.9s ease-out both;
        }

        .logo-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 42px;
        }

        .logo-wrapper {
          margin-bottom: 28px;
          cursor: pointer;
          transition: 0.5s ease;
        }

        .logo-wrapper:hover {
          transform: scale(1.1);
        }

        .dark .logo-wrapper {
          filter: drop-shadow(0 0 35px rgba(239, 68, 68, 0.85));
        }

        .light .logo-wrapper {
          filter: drop-shadow(0 0 25px rgba(239, 68, 68, 0.45));
        }

        .logo-image {
          width: 230px;
          object-fit: contain;
          animation: logo-glow 2.8s ease-in-out infinite;
        }

        .title-divider {
          display: flex;
          align-items: center;
          width: 100%;
          max-width: 340px;
          gap: 18px;
        }

        .title-divider div {
          height: 1px;
          flex: 1;
          background: linear-gradient(to right, transparent, #ef4444, #dc2626);
          box-shadow: 0 0 12px rgba(239, 68, 68, 0.8);
        }

        .title-divider div:last-child {
          background: linear-gradient(to left, transparent, #ef4444, #dc2626);
        }

        .title-divider h2 {
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .dark .title-divider h2 {
          color: rgba(254, 226, 226, 0.7);
        }

        .light .title-divider h2 {
          color: #b91c1c;
        }

        .card-border {
          position: relative;
          padding: 1px;
          border-radius: 40px;
          overflow: hidden;
          transition: 0.5s ease;
        }

        .dark .card-border {
          background: linear-gradient(
            to bottom right,
            rgba(239, 68, 68, 0.3),
            rgba(39, 39, 42, 0.4),
            transparent
          );
        }

        .light .card-border {
          background: linear-gradient(to bottom right, #fecaca, #ffffff, #fee2e2);
        }

        .card-spin {
          position: absolute;
          inset: -100%;
          background: conic-gradient(
            from 0deg,
            transparent 0%,
            transparent 38%,
            #dc2626 50%,
            transparent 62%,
            transparent 100%
          );
          opacity: 0;
          animation: border-spin 4s linear infinite;
          transition: 0.7s ease;
          pointer-events: none;
        }

        .card-border:hover .card-spin {
          opacity: 1;
        }

        .reset-card {
          position: relative;
          border-radius: 39px;
          overflow: hidden;
          border: 1px solid;
          padding: 44px 40px;
        }

        .dark .reset-card {
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(30px);
          border-color: rgba(239, 68, 68, 0.2);
          box-shadow: 0 0 65px rgba(239, 68, 68, 0.28);
        }

        .light .reset-card {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(20px);
          border-color: #fee2e2;
          box-shadow: 0 25px 70px rgba(239, 68, 68, 0.22);
        }

        .card-hover {
          position: absolute;
          inset: 0;
          border-radius: 39px;
          opacity: 0;
          pointer-events: none;
          transition: 0.5s ease;
          background: linear-gradient(
            to bottom right,
            rgba(239, 68, 68, 0.15),
            transparent,
            rgba(244, 63, 94, 0.15)
          );
        }

        .card-border:hover .card-hover {
          opacity: 1;
        }

        .reset-form,
        .success-box {
          position: relative;
          z-index: 10;
        }

        .info-text {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-bottom: 34px;
          color: #ef4444;
        }

        .info-text p {
          font-size: 11px;
          text-align: center;
          font-weight: 500;
          opacity: 0.7;
          line-height: 1.6;
        }

        .dark .info-text p {
          color: #a1a1aa;
        }

        .light .info-text p {
          color: #52525b;
        }

        .input-list {
          display: flex;
          flex-direction: column;
          gap: 22px;
          margin-bottom: 38px;
        }

        .input-box {
          position: relative;
        }

        .input-icon {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          z-index: 20;
          transition: 0.3s ease;
        }

        .dark .input-icon {
          color: rgba(255, 255, 255, 0.25);
        }

        .light .input-icon {
          color: #f87171;
        }

        .input-box:focus-within .input-icon {
          color: #f87171;
        }

        .input-box input {
          width: 100%;
          height: 58px;
          border-radius: 16px;
          border: 1px solid;
          outline: none;
          padding-left: 48px;
          padding-right: 64px;
          font-size: 14px;
          font-weight: 600;
          transition: 0.3s ease;
        }

        .dark .input-box input {
          background: rgba(24, 24, 27, 0.6);
          border-color: #27272a;
          color: white;
        }

        .dark .input-box input::placeholder {
          color: rgba(255, 255, 255, 0.3);
        }

        .light .input-box input {
          background: rgba(255, 255, 255, 0.75);
          border-color: #fee2e2;
          color: #171717;
        }

        .light .input-box input::placeholder {
          color: #737373;
        }

        .input-box input:focus {
          border-color: rgba(239, 68, 68, 0.7);
          box-shadow: 0 0 28px rgba(239, 68, 68, 0.35);
        }

        .eye-button {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          z-index: 20;
          width: 34px;
          height: 34px;
          border: none;
          background: transparent;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .dark .eye-button {
          color: rgba(255, 255, 255, 0.35);
        }

        .dark .eye-button:hover {
          color: white;
        }

        .light .eye-button {
          color: #f87171;
        }

        .light .eye-button:hover {
          color: #b91c1c;
        }

        .rules-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 40px;
        }

        .rule-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          min-height: 42px;
          border-radius: 12px;
          border: 1px solid;
          transition: 0.2s ease;
        }

        .dark .rule-item {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.1);
        }

        .light .rule-item {
          background: #f5f5f5;
          border-color: #e5e5e5;
        }

        .rule-item span {
          font-size: 14px;
          font-weight: 500;
        }

        .dark .rule-item span {
          color: #d4d4d8;
        }

        .light .rule-item span {
          color: #525252;
        }

        .rule-valid-icon {
          color: #16a34a;
          flex-shrink: 0;
        }

        .rule-invalid-icon {
          flex-shrink: 0;
        }

        .dark .rule-invalid-icon {
          color: rgba(255, 255, 255, 0.4);
        }

        .light .rule-invalid-icon {
          color: #a3a3a3;
        }

        .rule-valid-text {
          color: #22c55e !important;
          font-weight: 800 !important;
        }

        .error-box {
          padding: 12px;
          border-radius: 12px;
          border: 1px solid;
          font-size: 11px;
          font-weight: 700;
          margin-bottom: 30px;
          animation: error 0.25s ease-out both;
        }

        .dark .error-box {
          background: rgba(220, 38, 38, 0.1);
          border-color: rgba(220, 38, 38, 0.3);
          color: #f87171;
        }

        .light .error-box {
          background: #fef2f2;
          border-color: #fee2e2;
          color: #dc2626;
        }

        .submit-button {
          position: relative;
          overflow: hidden;
          width: 100%;
          height: 58px;
          border-radius: 16px;
          border: 1px solid;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          font-weight: 900;
          cursor: pointer;
          transition: 0.3s ease;
        }

        .submit-button span {
          position: relative;
          z-index: 10;
          letter-spacing: 0.18em;
          font-size: 12px;
          text-transform: uppercase;
        }

        .submit-button svg {
          position: relative;
          z-index: 10;
          transition: 0.3s ease;
        }

        .submit-button.active {
          background: linear-gradient(to right, #dc2626, #e11d48, #b91c1c);
          color: white;
          border-color: rgba(252, 165, 165, 0.2);
          box-shadow: 0 0 40px rgba(239, 68, 68, 0.55);
        }

        .submit-button.active:hover {
          transform: scale(1.02);
          box-shadow: 0 0 75px rgba(239, 68, 68, 0.9);
        }

        .submit-button.active:hover svg {
          transform: translateX(4px);
        }

        .submit-button.passive {
          background: rgba(69, 10, 10, 0.2);
          color: rgba(255, 255, 255, 0.8);
          border-color: rgba(255, 255, 255, 0.7);
          cursor: not-allowed;
        }

        .button-shine {
          position: absolute !important;
          inset: 0;
          transform: translateX(-120%);
          background: linear-gradient(
            to right,
            transparent,
            rgba(255, 255, 255, 0.35),
            transparent
          );
          transition: 0.7s ease;
        }

        .submit-button:hover .button-shine {
          transform: translateX(120%);
        }

        .loading-circle {
          width: 20px;
          height: 20px;
          border-radius: 999px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          animation: spin 1s linear infinite;
          position: relative;
          z-index: 10;
        }

        .bottom-link-area {
          padding-top: 46px;
          margin-top: 46px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          justify-content: center;
        }

        .back-link {
          border: none;
          background: transparent;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: 0.3s ease;
        }

        .dark .back-link {
          color: rgba(255, 255, 255, 0.45);
        }

        .dark .back-link:hover {
          color: #f87171;
        }

        .light .back-link {
          color: #737373;
        }

        .light .back-link:hover {
          color: #dc2626;
        }

        .success-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 20px 0;
          animation: success-view 0.5s ease-out both;
        }

        .success-icon {
          width: 80px;
          height: 80px;
          border-radius: 999px;
          border: 2px solid;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 30px;
          animation: bounce-slow 3s ease-in-out infinite;
        }

        .dark .success-icon {
          background: rgba(34, 197, 94, 0.1);
          border-color: rgba(34, 197, 94, 0.5);
          color: #4ade80;
        }

        .light .success-icon {
          background: #f0fdf4;
          border-color: #bbf7d0;
          color: #16a34a;
        }

        .success-box h3 {
          font-size: 18px;
          font-weight: 900;
          margin-bottom: 18px;
        }

        .success-box p {
          font-size: 14px;
          font-weight: 500;
          line-height: 1.7;
          margin-bottom: 42px;
        }

        .dark .success-box p {
          color: #a1a1aa;
        }

        .light .success-box p {
          color: #52525b;
        }

        .footer-text {
          margin-top: 50px;
          text-align: center;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.5em;
          font-weight: 700;
        }

        .dark .footer-text {
          color: rgba(255, 255, 255, 0.2);
        }

        .light .footer-text {
          color: rgba(185, 28, 28, 0.5);
        }

        @keyframes pulse-slow {
          0%, 100% {
            transform: scale(1.05);
          }
          50% {
            transform: scale(1.08);
          }
        }

        @keyframes login {
          from {
            opacity: 0;
            transform: translateY(35px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes success-view {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes error {
          from {
            opacity: 0;
            transform: translateY(-6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes energy-one {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(40px, 35px) scale(1.08);
          }
        }

        @keyframes energy-two {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(-35px, -30px) scale(1.1);
          }
        }

        @keyframes border-spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes logo-glow {
          0%, 100% {
            filter: drop-shadow(0 0 12px rgba(239, 68, 68, 0.45));
          }
          50% {
            filter: drop-shadow(0 0 32px rgba(239, 68, 68, 0.95));
          }
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 520px) {
          .reset-page {
            padding: 18px;
          }

          .reset-card {
            padding: 36px 24px;
          }

          .logo-image {
            width: 200px;
          }

          .title-divider {
            max-width: 300px;
          }
        }
      `}</style>
    </main>
  );
}