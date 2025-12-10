import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ShieldCheck, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { authApi } from '../lib/api';

export function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('admin@insurance.com');
  const [password, setPassword] = useState('password123');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const response = await authApi.login(email, password);
      if (response.access_token) {
        localStorage.setItem('access_token', response.access_token);
        navigate('/');
      } else {
        setError('Login failed - no token received');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.response?.data?.detail || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-surface-900 via-surface-950 to-primary-950 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgba(16, 185, 154, 0.15) 1px, transparent 0)`,
            backgroundSize: '40px 40px',
          }} />
        </div>
        
        {/* Floating Elements */}
        <motion.div 
          className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl"
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ 
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div 
          className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary-600/10 rounded-full blur-3xl"
          animate={{ 
            scale: [1.2, 1, 1.2],
            opacity: [0.5, 0.3, 0.5],
          }}
          transition={{ 
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-500/25">
                <ShieldCheck className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">ScreenGuard</h1>
                <p className="text-sm text-surface-400">Compliance Engine</p>
              </div>
            </div>

            <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
              Enterprise Sanctions<br />
              Screening Platform
            </h2>
            <p className="text-lg text-surface-400 max-w-md">
              Comprehensive compliance solution for insurance operations across the GCC region. 
              Real-time screening, workflow automation, and regulatory reporting.
            </p>

            <div className="mt-12 grid grid-cols-2 gap-6">
              <div className="p-4 rounded-xl bg-surface-800/30 backdrop-blur border border-surface-700/50">
                <p className="text-3xl font-bold text-primary-400">15K+</p>
                <p className="text-sm text-surface-400">Daily Screenings</p>
              </div>
              <div className="p-4 rounded-xl bg-surface-800/30 backdrop-blur border border-surface-700/50">
                <p className="text-3xl font-bold text-primary-400">6</p>
                <p className="text-sm text-surface-400">GCC Countries</p>
              </div>
              <div className="p-4 rounded-xl bg-surface-800/30 backdrop-blur border border-surface-700/50">
                <p className="text-3xl font-bold text-primary-400">45ms</p>
                <p className="text-sm text-surface-400">Avg Response</p>
              </div>
              <div className="p-4 rounded-xl bg-surface-800/30 backdrop-blur border border-surface-700/50">
                <p className="text-3xl font-bold text-primary-400">99.9%</p>
                <p className="text-sm text-surface-400">Uptime SLA</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-surface-950">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <span className="font-semibold text-surface-100">ScreenGuard</span>
          </div>

          <h2 className="text-2xl font-bold text-surface-100 mb-2">Welcome back</h2>
          <p className="text-surface-400 mb-8">Sign in to your account to continue</p>

          <form onSubmit={handleLogin} className="space-y-5">
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              icon={<Mail className="w-4 h-4" />}
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                icon={<Lock className="w-4 h-4" />}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[38px] text-surface-500 hover:text-surface-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-surface-600 bg-surface-800 text-primary-500 focus:ring-primary-500 focus:ring-offset-surface-900"
                />
                <span className="text-sm text-surface-400">Remember me</span>
              </label>
              <a href="#" className="text-sm text-primary-400 hover:text-primary-300 transition-colors">
                Forgot password?
              </a>
            </div>

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              Sign In
            </Button>
          </form>

          <div className="mt-8 p-4 rounded-lg bg-surface-800/30 border border-surface-700/50">
            <p className="text-xs text-surface-500 mb-2">Demo Credentials</p>
            <p className="text-sm text-surface-300">Email: admin@insurance.com</p>
            <p className="text-sm text-surface-300">Password: password123</p>
          </div>

          <p className="mt-8 text-center text-sm text-surface-500">
            Need help? Contact{' '}
            <a href="#" className="text-primary-400 hover:text-primary-300 transition-colors">
              IT Support
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

