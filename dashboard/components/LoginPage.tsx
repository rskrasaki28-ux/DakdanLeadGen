
import React, { useState, useEffect } from 'react';
import { auth } from '../services/authService';
import { User } from '../types';
import { Mail, Lock, User as UserIcon, Loader2, Chrome, AlertCircle, AtSign, ShieldCheck, ArrowRight, X } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [view, setView] = useState<'LOGIN' | 'REGISTER' | '2FA'>('LOGIN');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [identifier, setIdentifier] = useState(''); 
  const [password, setPassword] = useState('');
  
  // Register State
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState(''); 
  const [name, setName] = useState('');

  // 2FA State
  const [twoFactorCode, setTwoFactorCode] = useState('');
  
  // Simulated Email Notification
  const [notification, setNotification] = useState<{title: string, message: string} | null>(null);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 8000); // Hide after 8s
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
        if (!identifier || !password) {
            setError('Please enter both identifier and password');
            setLoading(false);
            return;
        }
        
        // Step 1
        const result = await auth.loginStep1(identifier, password);
        
        if (result.success && result.requires2FA) {
            setView('2FA');
            
            // Simulate Email Sending Delay
            setTimeout(() => {
                if (result.demoCode) {
                    setNotification({
                        title: 'New Email: Dakdan Security',
                        message: `Your verification code is: ${result.demoCode}`
                    });
                }
            }, 1500);

        } else {
            setError(result.message || 'Login failed');
        }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setLoading(true);

      try {
          const result = await auth.verify2FA(twoFactorCode);
          if (result.success && result.user) {
              onLoginSuccess(result.user);
          } else {
              setError(result.message || "Invalid code");
          }
      } catch (e) {
          setError("Verification failed");
      } finally {
          setLoading(false);
      }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setLoading(true);
      
      if (!name || !username || !email || !password) {
          setError('All fields are required');
          setLoading(false);
          return;
      }

      const result = await auth.register(name, username, email, password);
      if (result.success) {
          const user = auth.getCurrentUser();
          if (user) onLoginSuccess(user);
      } else {
          setError(result.message || 'Registration failed');
      }
      setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const result = await auth.loginWithGoogle();
    if (result.success && result.user) {
      onLoginSuccess(result.user);
    }
    setLoading(false);
  };

  const handleResendCode = async () => {
      const newCode = await auth.resendCode();
      if (newCode) {
         setNotification({
            title: 'New Email: Dakdan Security',
            message: `Your NEW verification code is: ${newCode}`
         });
      }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative">
      
      {/* Simulated Email Notification Toast */}
      {notification && (
          <div className="fixed top-4 right-4 max-w-sm w-full bg-white rounded-lg shadow-2xl border-l-4 border-blue-600 overflow-hidden z-50 animate-bounce-in">
              <div className="p-4 flex items-start gap-3">
                  <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                      <Mail size={20} />
                  </div>
                  <div className="flex-1">
                      <h4 className="font-bold text-slate-900 text-sm">{notification.title}</h4>
                      <p className="text-slate-600 text-sm mt-1">{notification.message}</p>
                      <p className="text-xs text-slate-400 mt-2">just now</p>
                  </div>
                  <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600">
                      <X size={16} />
                  </button>
              </div>
          </div>
      )}

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-dakdan-navy to-blue-900 p-8 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            <div className="relative z-10">
                <div className="mx-auto w-16 h-16 bg-white/10 rounded-xl flex items-center justify-center mb-4 backdrop-blur-sm border border-white/20 shadow-inner">
                    <span className="text-2xl font-bold text-white">DW</span>
                </div>
                <h1 className="text-2xl font-bold text-white mb-1">Dakdan AI Engine</h1>
                <p className="text-blue-200 text-sm">Digital Employee Workspace</p>
            </div>
        </div>

        {/* Tabs (Hidden if 2FA) */}
        {view !== '2FA' && (
            <div className="flex border-b border-slate-100">
                <button 
                    onClick={() => { setView('LOGIN'); setError(''); }}
                    className={`flex-1 py-4 text-sm font-medium transition-colors ${view === 'LOGIN' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Login
                </button>
                <button 
                    onClick={() => { setView('REGISTER'); setError(''); }}
                    className={`flex-1 py-4 text-sm font-medium transition-colors ${view === 'REGISTER' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Create Account
                </button>
            </div>
        )}

        {/* Form Container */}
        <div className="p-8">
            {error && (
                <div className="mb-6 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 border border-red-100 animate-shake">
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}

            {/* REGISTER FORM */}
            {view === 'REGISTER' && (
                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                    <div className="relative">
                        <UserIcon className="absolute left-3 top-3.5 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Full Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-black"
                            required
                        />
                    </div>
                    <div className="relative">
                        <AtSign className="absolute left-3 top-3.5 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-black"
                            required
                        />
                    </div>
                    <div className="relative">
                        <Mail className="absolute left-3 top-3.5 text-slate-400" size={18} />
                        <input 
                            type="email" 
                            placeholder="Email Address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-black"
                            required
                        />
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3.5 text-slate-400" size={18} />
                        <input 
                            type="password" 
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-black"
                            required
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-dakdan-navy text-white py-3 rounded-lg font-semibold hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : 'Create Account'}
                    </button>
                </form>
            )}

            {/* LOGIN FORM */}
            {view === 'LOGIN' && (
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                    <div className="relative">
                        <UserIcon className="absolute left-3 top-3.5 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Email or Username"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-black"
                            required
                        />
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3.5 text-slate-400" size={18} />
                        <input 
                            type="password" 
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-black"
                            required
                        />
                    </div>
                    
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-dakdan-navy text-white py-3 rounded-lg font-semibold hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 group"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : (
                            <>
                                Next Step <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </form>
            )}

            {/* 2FA FORM */}
            {view === '2FA' && (
                <form onSubmit={handle2FASubmit} className="space-y-6">
                    <div className="text-center">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <ShieldCheck className="text-green-600" size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">2-Step Verification</h3>
                        <p className="text-sm text-slate-500">
                            We sent a code to your email/phone. Enter it below to confirm your identity.
                        </p>
                    </div>

                    <div>
                        <input 
                            type="text" 
                            placeholder="Enter 6-digit code"
                            value={twoFactorCode}
                            onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            className="w-full text-center text-2xl tracking-widest py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-black font-mono"
                            required
                            autoFocus
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading || twoFactorCode.length < 6}
                        className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : 'Verify & Sign In'}
                    </button>

                    <div className="flex justify-between items-center text-sm">
                        <button type="button" onClick={() => setView('LOGIN')} className="text-slate-400 hover:text-slate-600">Back to Login</button>
                        <button type="button" onClick={handleResendCode} className="text-blue-600 hover:text-blue-800 font-medium">Resend Code</button>
                    </div>
                </form>
            )}

            {view !== '2FA' && (
                <>
                    <div className="my-6 flex items-center gap-4">
                        <div className="h-px flex-1 bg-slate-200"></div>
                        <span className="text-xs text-slate-400 font-medium">OR CONTINUE WITH</span>
                        <div className="h-px flex-1 bg-slate-200"></div>
                    </div>

                    <button 
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="w-full bg-white border border-slate-200 text-slate-700 py-3 rounded-lg font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-3"
                    >
                        <Chrome size={20} className="text-red-500" />
                        Google Account
                    </button>
                </>
            )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
