"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, ArrowRight, CheckCircle, AlertCircle } from "lucide-react";
import Link from "next/link";

// HELPER COMPONENTS //

const FormInput = ({ name, type, placeholder, icon: Icon, value, onChange, onBlur, error, touched, showPassword, togglePassword }) => (
  <div className="relative">
    <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
    <input
      id={name}
      name={name}
      type={showPassword && type === 'password' ? 'text' : type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      className={`w-full pl-12 pr-${type === 'password' ? '12' : '4'} py-3 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 text-gray-100 border transition-colors duration-300 ${touched && error ? 'border-red-500 focus:ring-red-500' : 'border-gray-700 focus:ring-cyan-500'}`}
      aria-invalid={touched && !!error}
      aria-describedby={`${name}-error`}
    />
    {type === 'password' && togglePassword && (
      <button
        type="button"
        onClick={togglePassword}
        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
      >
        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
      </button>
    )}
    <AnimatePresence>
      {touched && error && (
        <motion.p
          id={`${name}-error`}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          className="text-red-500 text-xs mt-1.5 ml-1"
        >
          {error}
        </motion.p>
      )}
    </AnimatePresence>
  </div>
);

const LoadingSpinner = () => (
  <motion.div 
    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
    animate={{ rotate: 360 }}
    transition={{ loop: Infinity, ease: "linear", duration: 1 }}
  />
);

// MAIN LOGIN COMPONENT //

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

  // Validation logic
  const validate = (fieldValues = form) => {
    let tempErrors = { ...errors };
    if ('email' in fieldValues) {
      tempErrors.email = /\S+@\S+\.\S+/.test(fieldValues.email) ? "" : "Please enter a valid email address.";
    }
    if ('password' in fieldValues) {
      tempErrors.password = fieldValues.password.length >= 1 ? "" : "Password is required.";
    }
    setErrors(tempErrors);
    return Object.values(tempErrors).every(x => x === "" || x === undefined);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    // Clear errors on change
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched({ ...touched, [name]: true });
    validate({ [name]: value });
  };

  // UPDATED HANDLE SUBMIT WITH PROPER ERROR HANDLING
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Clear any previous API errors
    setErrors(prev => ({ ...prev, api: undefined }));
    
    // Mark all fields as touched
    setTouched({ email: true, password: true });
    
    // Validate form
    if (!validate()) {
      setLoading(false);
      return;
    }

    try {
      console.log('Attempting login for:', form.email);
      
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      console.log('Response status:', res.status);
      console.log('Response headers:', [...res.headers.entries()]);

      // Get the raw response text first
      const responseText = await res.text();
      console.log('Raw response:', responseText);
      
      // Try to parse as JSON
      let data;
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        // Response is not JSON
        console.error('Failed to parse JSON:', responseText);
        
        if (res.status === 405) {
          throw new Error('Login endpoint not found. Please check if the server is running correctly.');
        } else if (res.status >= 500) {
          throw new Error('Server error. Please try again later.');
        } else {
          throw new Error(`Unexpected server response (${res.status}). Please try again.`);
        }
      }

      // Check if the request was successful
      if (!res.ok) {
        throw new Error(data.error || `Login failed (${res.status}). Please try again.`);
      }

      // Login successful
      console.log('Login successful:', data);
      setLoginSuccess(true);
      
      // Store user data if available
      if (data.user) {
        console.log('Storing user data:', data.user);
        // Uncomment these when you're ready to use them:
        // localStorage.setItem('userData', JSON.stringify(data.user));
      }
      if (data.token) {
        // localStorage.setItem('authToken', data.token);
      }
      
      // Redirect after a short delay to show success message
      setTimeout(() => {
        router.push('/dashboard'); // Make sure this route exists
      }, 2000);

    } catch (err) {
      console.error('Login error:', err);
      
      // Set user-friendly error message
      let errorMessage = 'An unexpected error occurred. Please try again.';
      
      if (err.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setErrors({ api: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-950 text-white relative overflow-hidden p-4">
      {/* Background Effects */}
      <div className="absolute w-[600px] h-[600px] bg-cyan-600/20 rounded-full blur-3xl -top-20 -left-40 animate-[pulse_8s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
      <div className="absolute w-[600px] h-[600px] bg-violet-600/20 rounded-full blur-3xl -bottom-20 -right-40 animate-[pulse_8s_cubic-bezier(0.4,0,0.6,1)_infinite_4s]" />
      
      <div className="bg-gray-900/70 p-8 rounded-2xl shadow-2xl w-full max-w-md relative z-10 border border-gray-700/50 backdrop-blur-xl">
        <AnimatePresence>
          {loginSuccess ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-10"
            >
              <CheckCircle className="mx-auto text-green-400 h-16 w-16 mb-4" />
              <h2 className="text-2xl font-bold mb-2">Welcome Back!</h2>
              <p className="text-gray-300 mb-6">Login successful. Redirecting to your dashboard...</p>
              <div className="flex justify-center">
                <LoadingSpinner />
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Header */}
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-violet-500 bg-clip-text text-transparent mb-2">
                  Welcome Back
                </h1>
                <p className="text-gray-400">Sign in to your StockSphere account</p>
              </div>

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <FormInput
                  name="email"
                  type="email"
                  placeholder="Email Address"
                  icon={Mail}
                  value={form.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={errors.email}
                  touched={touched.email}
                />

                <FormInput
                  name="password"
                  type="password"
                  placeholder="Password"
                  icon={Lock}
                  value={form.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={errors.password}
                  touched={touched.password}
                  showPassword={showPassword}
                  togglePassword={() => setShowPassword(!showPassword)}
                />

                {/* Forgot Password Link */}
                <div className="text-right">
                  <Link
                    href="/forgot-password"
                    className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    Forgot your password?
                  </Link>
                </div>

                {/* API Error Message */}
                {errors.api && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-3 bg-red-900/30 border border-red-500/30 rounded-lg text-red-400 text-sm"
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{errors.api}</span>
                  </motion.div>
                )}

                {/* Login Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold text-white bg-gradient-to-r from-cyan-500 to-violet-600 shadow-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {loading ? (
                    <LoadingSpinner />
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>

              {/* Register Link */}
              <div className="mt-8 text-center">
                <p className="text-gray-400">
                  Don't have an account?{" "}
                  <Link
                    href="/register"
                    className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                  >
                    Create one here
                  </Link>
                </p>
              </div>

              {/* Additional Options */}
              <div className="mt-6 pt-6 border-t border-gray-700">
                <div className="flex items-center justify-center space-x-4 text-sm text-gray-400">
                  <Link href="/help" className="hover:text-gray-300 transition-colors">
                    Need Help?
                  </Link>
                  <span>•</span>
                  <Link href="/privacy" className="hover:text-gray-300 transition-colors">
                    Privacy Policy
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}