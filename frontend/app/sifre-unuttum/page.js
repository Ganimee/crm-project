'use client';

import React, { useState } from 'react';
import {
  Mail,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  RefreshCcw,
  Sun,
  Moon,
  ArrowLeft,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTheme } from '../context/ThemeContext';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { isDarkMode, toggleTheme } = useTheme();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState({ type: null, message: '' });

  const handleSendCode = async (e) => {
    e.preventDefault();

    setIsLoading(true);
    setStatus({ type: null, message: '' });

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ eposta: email }),
      });

      if (!res.ok) {
        throw new Error('Mail gönderilemedi');
      }

      setStatus({
        type: 'success',
        message: 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.',
      });
    } catch (err) {
      setStatus({
        type: 'error',
        message: 'E-posta gönderilirken bir hata oluştu. Lütfen tekrar deneyin.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main
      className={`min-h-screen flex items-center justify-center p-6 font-sans relative overflow-hidden transition-all duration-700 ${
        isDarkMode
          ? 'bg-[#050505] text-white'
          : 'bg-[#fff7f8] text-neutral-900'
      }`}
    >
      <div className="absolute top-8 right-8 z-50 flex gap-4">
        <button
          onClick={toggleTheme}
          title="Temayı Değiştir"
          className={`p-3 rounded-2xl transition-all duration-300 shadow-xl hover:scale-110 active:scale-95 border ${
            isDarkMode
              ? 'bg-zinc-900/60 text-yellow-400 hover:border-yellow-400/50 border-zinc-800 shadow-[0_0_25px_rgba(239,68,68,0.35)]'
              : 'bg-white/80 text-red-700 hover:bg-red-50 border-red-100 shadow-[0_0_25px_rgba(239,68,68,0.25)]'
          }`}
        >
          {isDarkMode ? (
            <Sun size={20} className="animate-spin-slow" />
          ) : (
            <Moon size={20} />
          )}
        </button>
      </div>

      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div
          className={`absolute top-[-12%] left-[-10%] w-[520px] h-[520px] rounded-full blur-[130px] transition-colors duration-1000 animate-energy-one ${
            isDarkMode ? 'bg-red-900/35' : 'bg-red-300/45'
          }`}
        />

        <div
          className={`absolute bottom-[-14%] right-[-12%] w-[480px] h-[480px] rounded-full blur-[130px] transition-colors duration-1000 animate-energy-two ${
            isDarkMode ? 'bg-rose-700/25' : 'bg-rose-200/60'
          }`}
        />

        <div
          className={`absolute top-[35%] right-[20%] w-[260px] h-[260px] rounded-full blur-[100px] animate-energy-three ${
            isDarkMode ? 'bg-red-500/15' : 'bg-red-400/20'
          }`}
        />

        <div
          className={`absolute inset-0 opacity-[0.04] ${
            isDarkMode ? '' : 'invert'
          }`}
          style={{
            backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
            backgroundSize: '30px 30px',
          }}
        />
      </div>

      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-1000 scale-105 animate-pulse-slow"
          style={{
            backgroundImage: "url('/login-bg.jpg')",
            opacity: isDarkMode ? 0.28 : 0.42,
            filter: isDarkMode
              ? 'contrast(1.25) brightness(0.65) saturate(1.25)'
              : 'contrast(1.1) brightness(1.1) saturate(1.25)',
          }}
        />

        <div
          className={`absolute inset-0 transition-all duration-700 ${
            isDarkMode
              ? 'bg-gradient-to-tr from-black via-black/50 to-red-950/30'
              : 'bg-gradient-to-tr from-white/70 via-transparent to-red-100/40'
          }`}
        />

        <div
          className={`absolute inset-0 transition-all duration-700 ${
            isDarkMode
              ? 'bg-[radial-gradient(circle_at_center,_transparent_0%,_black_88%)]'
              : 'bg-[radial-gradient(circle_at_center,_transparent_0%,_white_72%)]'
          }`}
        />
      </div>

      <div className="w-full max-w-[440px] relative z-10 animate-login hover:scale-[1.01] transition-transform duration-500">
        <div className="flex flex-col items-center mb-10">
          <div
            className={`mb-6 transition-all duration-500 hover:scale-110 cursor-pointer relative ${
              isDarkMode
                ? 'drop-shadow-[0_0_35px_rgba(239,68,68,0.85)]'
                : 'drop-shadow-[0_0_25px_rgba(239,68,68,0.45)]'
            }`}
          >
            <img
              src={isDarkMode ? '/logo_dark.png' : '/logo.png'}
              alt="Sporthink Logo"
              className="relative w-[230px] object-contain transition-all duration-500 animate-logo-glow"
            />
          </div>

          <div className="flex items-center gap-3 w-full max-w-[300px]">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-red-500 to-red-600 shadow-[0_0_12px_rgba(239,68,68,0.8)]" />

            <h2
              className={`font-black tracking-[0.30em] text-[10px] uppercase whitespace-nowrap transition-colors duration-500 ${
                isDarkMode
                  ? 'text-red-100/70 hover:text-red-400'
                  : 'text-red-700'
              }`}
            >
              {status.type === 'success'
                ? 'BAĞLANTI GÖNDERİLDİ'
                : 'ŞİFREMİ UNUTTUM'}
            </h2>

            <div className="h-px flex-1 bg-gradient-to-l from-transparent via-red-500 to-red-600 shadow-[0_0_12px_rgba(239,68,68,0.8)]" />
          </div>
        </div>

        <div
          className={`relative group p-[1px] rounded-[40px] overflow-hidden transition-all duration-500 hover:-translate-y-2 ${
            isDarkMode
              ? 'bg-gradient-to-br from-red-500/30 via-zinc-800/40 to-transparent'
              : 'bg-gradient-to-br from-red-200 via-white to-red-100'
          }`}
        >
          <div className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,transparent_0%,transparent_38%,#dc2626_50%,transparent_62%,transparent_100%)] animate-border-spin opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

          <div
            className={`relative p-10 rounded-[39px] overflow-hidden border ${
              isDarkMode
                ? 'bg-black/75 backdrop-blur-3xl border-red-500/20 shadow-[0_0_65px_rgba(239,68,68,0.28)]'
                : 'bg-white/90 backdrop-blur-xl border-red-100 shadow-[0_25px_70px_rgba(239,68,68,0.22)]'
            }`}
          >
            <div className="absolute inset-0 rounded-[39px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-br from-red-500/15 via-transparent to-rose-500/15" />

            <div
              className={`absolute -top-24 -left-24 w-56 h-56 blur-[70px] pointer-events-none transition-all duration-700 ${
                isDarkMode
                  ? 'bg-red-600/15 group-hover:bg-red-600/25'
                  : 'bg-red-500/15 group-hover:bg-red-500/20'
              }`}
            />

            {status.type === 'success' ? (
              <div className="flex flex-col items-center text-center py-4 animate-success-view relative z-10">
                <div
                  className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 border-2 animate-bounce-slow ${
                    isDarkMode
                      ? 'bg-green-500/10 border-green-500/50 text-green-400'
                      : 'bg-green-50 border-green-200 text-green-600'
                  }`}
                >
                  <CheckCircle2 size={40} />
                </div>

                <h3
                  className={`text-lg font-black mb-2 ${
                    isDarkMode ? 'text-white' : 'text-neutral-900'
                  }`}
                >
                  E-posta Gönderildi
                </h3>

                <p
                  className={`text-sm font-medium leading-relaxed mb-8 ${
                    isDarkMode ? 'text-zinc-400' : 'text-zinc-600'
                  }`}
                >
                  <span className="font-bold text-red-500">{email}</span>{' '}
                  adresine şifre sıfırlama bağlantısı gönderdik.
                </p>

                <button
                  onClick={() => setStatus({ type: null, message: '' })}
                  className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-all duration-300 hover:scale-105 ${
                    isDarkMode
                      ? 'text-zinc-500 hover:text-white'
                      : 'text-zinc-400 hover:text-neutral-900'
                  }`}
                >
                  <RefreshCcw size={14} />
                  Farklı e-posta dene
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendCode} className="relative z-10">
                <p
                  className={`text-[11px] text-center font-medium opacity-70 mb-7 leading-relaxed ${
                    isDarkMode ? 'text-zinc-400' : 'text-zinc-600'
                  }`}
                ></p>

                <div className="relative group/input mb-9">
                  <Mail
                    className={`absolute left-4 top-1/2 -translate-y-1/2 transition-all duration-300 group-focus-within/input:scale-110 ${
                      isDarkMode
                        ? 'text-white/25 group-focus-within/input:text-red-400'
                        : 'text-red-400 group-focus-within/input:text-red-600'
                    }`}
                    size={20}
                  />

                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full transition-all duration-300 text-sm outline-none border rounded-2xl py-4 pl-12 pr-4 font-semibold ${
                      isDarkMode
                        ? 'bg-zinc-900/60 border-zinc-800 text-white placeholder-white/30 focus:border-red-500/70 focus:bg-zinc-900/80 focus:ring-4 ring-red-600/10 focus:shadow-[0_0_28px_rgba(239,68,68,0.45)] hover:shadow-[0_0_18px_rgba(239,68,68,0.22)]'
                        : 'bg-white/75 border-red-100 text-neutral-900 placeholder-neutral-500 focus:border-red-400 focus:bg-white focus:ring-4 ring-red-500/10 focus:shadow-[0_0_24px_rgba(239,68,68,0.25)] shadow-inner'
                    }`}
                    placeholder="E-posta Adresi"
                    required
                  />
                </div>

                {status.type === 'error' && (
                  <div
                    className={`flex items-center gap-2 p-3 rounded-xl border text-[11px] font-bold animate-error mb-5 ${
                      isDarkMode
                        ? 'bg-red-600/10 border-red-600/30 text-red-400 shadow-[0_0_18px_rgba(239,68,68,0.25)]'
                        : 'bg-red-50 border-red-100 text-red-600'
                    }`}
                  >
                    <AlertCircle size={14} />
                    <span>{status.message}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="mt-10 relative overflow-hidden w-full bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:via-red-600 hover:to-rose-700 hover:scale-[1.02] active:scale-[0.96] disabled:opacity-30 text-white font-black py-4 rounded-2xl transition-all duration-300 shadow-[0_0_40px_rgba(239,68,68,0.55)] hover:shadow-[0_0_75px_rgba(239,68,68,0.9)] flex items-center justify-center gap-3 border border-red-300/20 group/btn"
                >
                  <span className="absolute inset-0 translate-x-[-120%] group-hover/btn:translate-x-[120%] transition-transform duration-700 bg-gradient-to-r from-transparent via-white/35 to-transparent" />

                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin relative z-10" />
                  ) : (
                    <>
                      <span className="tracking-widest text-xs uppercase relative z-10">
                        Bağlantı Gönder
                      </span>
                      <ChevronRight
                        size={18}
                        className="relative z-10 group-hover/btn:translate-x-1 transition-transform"
                      />
                    </>
                  )}
                </button>

                <div style={{ height: '56px' }} />

                <div className="pt-6 border-t border-zinc-500/10 flex justify-center relative z-10">
                  <button
                    type="button"
                    onClick={() => router.push('/')}
                    className={`flex items-center gap-2 text-[12px] font-medium normal-case tracking-normal transition-all duration-300 hover:gap-3 ${
                      isDarkMode
                        ? 'text-white/45 hover:text-red-400'
                        : 'text-neutral-500 hover:text-red-600'
                    }`}
                  >
                    <ArrowLeft size={15} />
                    Giriş Ekranına Dön
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center gap-2">
          <p
            className={`text-[9px] text-center uppercase tracking-[0.5em] font-bold transition-colors ${
              isDarkMode ? 'text-white/20' : 'text-red-700/50'
            }`}
          >
            Sporthink Veri Analitiği • CRM Platformu
          </p>

          <div className="flex items-center gap-2 opacity-70">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span
              className={`text-[9px] font-bold uppercase tracking-widest ${
                isDarkMode ? 'text-zinc-500' : 'text-zinc-400'
              }`}
            ></span>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes pulse-slow {
          0%,
          100% {
            transform: scale(1.05);
          }
          50% {
            transform: scale(1.08);
          }
        }

        .animate-pulse-slow {
          animation: pulse-slow 15s ease-in-out infinite;
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

        .animate-login {
          animation: login 0.9s ease-out both;
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

        .animate-success-view {
          animation: success-view 0.5s ease-out both;
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

        .animate-error {
          animation: error 0.25s ease-out both;
        }

        @keyframes bounce-slow {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .animate-bounce-slow {
          animation: bounce-slow 3s ease-in-out infinite;
        }

        @keyframes energy-one {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(40px, 35px) scale(1.08);
          }
        }

        .animate-energy-one {
          animation: energy-one 9s ease-in-out infinite;
        }

        @keyframes energy-two {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(-35px, -30px) scale(1.1);
          }
        }

        .animate-energy-two {
          animation: energy-two 11s ease-in-out infinite;
        }

        @keyframes energy-three {
          0%,
          100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-28px) scale(1.12);
          }
        }

        .animate-energy-three {
          animation: energy-three 7s ease-in-out infinite;
        }

        @keyframes border-spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .animate-border-spin {
          animation: border-spin 4s linear infinite;
        }

        @keyframes logo-glow {
          0%,
          100% {
            filter: drop-shadow(0 0 12px rgba(239, 68, 68, 0.45));
          }
          50% {
            filter: drop-shadow(0 0 32px rgba(239, 68, 68, 0.95));
          }
        }

        .animate-logo-glow {
          animation: logo-glow 2.8s ease-in-out infinite;
        }

        .animate-spin-slow {
          animation: spin 8s linear infinite;
        }
      `}</style>
    </main>
  );
}