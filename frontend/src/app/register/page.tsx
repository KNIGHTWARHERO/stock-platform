"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { User, Phone, Mail, Lock, ArrowRight, ArrowLeft, CheckCircle } from "lucide-react";

// HELPER COMPONENTS //

const ProgressBar = ({ step, totalSteps }) => (
  <div className="flex w-full mb-8" aria-label={`Step ${step} of ${totalSteps}`}>
    {Array.from({ length: totalSteps }).map((_, i) => (
      <div key={i} className="flex-1 px-1">
        <div className={`h-1.5 rounded-full transition-colors duration-500 ${i < step ? 'bg-gradient-to-r from-cyan-400 to-violet-500' : 'bg-gray-700'}`} />
      </div>
    ))}
  </div>
);

const FormInput = ({ name, type, placeholder, icon: Icon, value, onChange, onBlur, error, touched }) => (
  <div className="relative">
    <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
    <input
      id={name}
      name={name}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      className={`w-full pl-12 pr-4 py-3 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 text-gray-100 border transition-colors duration-300 ${touched && error ? 'border-red-500 focus:ring-red-500' : 'border-gray-700 focus:ring-cyan-500'}`}
      aria-invalid={touched && !!error}
      aria-describedby={`${name}-error`}
    />
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

const PasswordStrengthMeter = ({ password }) => {
    const checkStrength = () => {
        let score = 0;
        if (password.length > 8) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;
        return score;
    };
    const score = checkStrength();
    const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][score] || "";
    const color = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-green-500"][score - 1] || "bg-gray-700";

    return (
        <div className="flex items-center gap-3 mt-2">
            <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                <motion.div className={`h-full ${color}`} animate={{ width: `${(score / 4) * 100}%` }} transition={{ duration: 0.5 }} />
            </div>
            <span className="text-xs text-gray-300 w-14 text-right">{strengthLabel}</span>
        </div>
    );
};

const LoadingSpinner = () => (
    <motion.div 
        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
        animate={{ rotate: 360 }}
        transition={{ loop: Infinity, ease: "linear", duration: 1 }}
    />
);


// MAIN PAGE COMPONENT //

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [form, setForm] = useState({ username: "", phone: "", email: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const TOTAL_STEPS = 3;

  // Central validation logic
  const validate = (fieldValues = form) => {
      let tempErrors = { ...errors };
      if ('username' in fieldValues) tempErrors.username = fieldValues.username.length >= 3 ? "" : "Username requires at least 3 characters.";
      if ('phone' in fieldValues) tempErrors.phone = /^[0-9]{10}$/.test(fieldValues.phone) ? "" : "Please enter a valid 10-digit phone number.";
      if ('email' in fieldValues) tempErrors.email = /\S+@\S+\.\S+/.test(fieldValues.email) ? "" : "Email address is not valid.";
      if ('password' in fieldValues) tempErrors.password = fieldValues.password.length >= 8 ? "" : "Password requires at least 8 characters.";
      if ('confirmPassword' in fieldValues) tempErrors.confirmPassword = fieldValues.confirmPassword === form.password ? "" : "Passwords do not match.";
      setErrors(tempErrors);
      return Object.values(tempErrors).every(x => x === "" || x === undefined);
  };

  const handleChange = e => {
      const { name, value } = e.target;
      setForm({ ...form, [name]: value });
  };

  const handleBlur = e => {
      const { name, value } = e.target;
      setTouched({ ...touched, [name]: true });
      validate({ [name]: value });
  };
  
  const handleNextStep = () => {
      setDirection(1);
      // Validate current step before proceeding
      if (step === 1) {
          setTouched({ ...touched, username: true, phone: true });
          if (validate({ username: form.username, phone: form.phone })) {
              setStep(prev => prev + 1);
          }
      } else if (step === 2) {
          setTouched({ ...touched, email: true, password: true, confirmPassword: true });
          if (validate({ email: form.email, password: form.password, confirmPassword: form.confirmPassword })) {
              setStep(prev => prev + 1);
          }
      }
  };

  const handlePrevStep = () => {
    setDirection(-1);
    setStep(prev => prev - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    // Final validation before submitting
    if (!validate()) {
        setLoading(false);
        return;
    }
    try {
        const { confirmPassword, ...submissionData } = form; // Exclude confirmPassword from submission
        const res = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(submissionData) });
        if (!res.ok) throw new Error( (await res.json()).message || "Registration failed.");
        setIsSuccess(true);
    } catch (err) {
        setErrors({ api: err.message });
    } finally {
        setLoading(false);
    }
  };

  const stepVariants = {
    hidden: (dir) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0 }),
    visible: { x: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 30 } },
    exit: (dir) => ({ x: dir < 0 ? "100%" : "-100%", opacity: 0, transition: { ease: "easeInOut", duration: 0.3 } }),
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-950 text-white relative overflow-hidden p-4">
      <div className="absolute w-[600px] h-[600px] bg-cyan-600/20 rounded-full blur-3xl -top-20 -left-40 animate-[pulse_8s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
      <div className="absolute w-[600px] h-[600px] bg-violet-600/20 rounded-full blur-3xl -bottom-20 -right-40 animate-[pulse_8s_cubic-bezier(0.4,0,0.6,1)_infinite_4s]" />
      
      <div className="bg-gray-900/70 p-8 rounded-2xl shadow-2xl w-full max-w-md relative z-10 border border-gray-700/50 backdrop-blur-xl">
        <AnimatePresence>
            {isSuccess ? (
                <motion.div key="success" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-10">
                    <CheckCircle className="mx-auto text-green-400 h-16 w-16 mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Account Created!</h2>
                    <p className="text-gray-300 mb-6">Welcome to the platform. You can now log in.</p>
                    <button onClick={() => router.push('/login')} className="w-full py-3 rounded-lg font-semibold text-white bg-gradient-to-r from-cyan-500 to-violet-600 hover:opacity-90">
                        Proceed to Login
                    </button>
                </motion.div>
            ) : (
                <motion.div>
                    <ProgressBar step={step} totalSteps={TOTAL_STEPS} />
                    <div className="relative overflow-hidden h-auto min-h-[350px]">
                      <AnimatePresence custom={direction} mode="wait">
                          {step === 1 && (
                              <motion.div key="step1" custom={direction} variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4 absolute w-full">
                                  <h2 className="text-2xl font-bold text-center mb-4">Personal Details</h2>
                                  <FormInput name="username" type="text" placeholder="Username" icon={User} value={form.username} onChange={handleChange} onBlur={handleBlur} error={errors.username} touched={touched.username} />
                                  <FormInput name="phone" type="tel" placeholder="Phone Number" icon={Phone} value={form.phone} onChange={handleChange} onBlur={handleBlur} error={errors.phone} touched={touched.phone} />
                              </motion.div>
                          )}
                          {step === 2 && (
                              <motion.div key="step2" custom={direction} variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4 absolute w-full">
                                  <h2 className="text-2xl font-bold text-center mb-4">Account Security</h2>
                                  <FormInput name="email" type="email" placeholder="Email Address" icon={Mail} value={form.email} onChange={handleChange} onBlur={handleBlur} error={errors.email} touched={touched.email} />
                                  <FormInput name="password" type="password" placeholder="Password" icon={Lock} value={form.password} onChange={handleChange} onBlur={handleBlur} error={errors.password} touched={touched.password} />
                                  <FormInput name="confirmPassword" type="password" placeholder="Confirm Password" icon={Lock} value={form.confirmPassword} onChange={handleChange} onBlur={handleBlur} error={errors.confirmPassword} touched={touched.confirmPassword} />
                                  <PasswordStrengthMeter password={form.password} />
                              </motion.div>
                          )}
                           {step === 3 && (
                                <motion.div key="step3" custom={direction} variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4 absolute w-full text-center">
                                    <h2 className="text-2xl font-bold text-center mb-4">Final Review</h2>
                                    <p className="text-gray-300">Please review your details before creating your account.</p>
                                    <div className="text-left bg-gray-800/50 p-4 rounded-lg space-y-2 mt-4 border border-gray-700">
                                        <p><strong>Username:</strong> {form.username}</p>
                                        <p><strong>Phone:</strong> {form.phone}</p>
                                        <p><strong>Email:</strong> {form.email}</p>
                                    </div>
                                    {errors.api && <p className="text-red-400 text-sm text-center mt-4 bg-red-900/30 p-2 rounded-md">{errors.api}</p>}
                                </motion.div>
                            )}
                      </AnimatePresence>
                    </div>

                    <div className="mt-8 flex items-center" style={{justifyContent: step === 1 ? 'flex-end' : 'space-between'}}>
                        {step > 1 && (
                            <button type="button" onClick={handlePrevStep} className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 transition-colors">
                                <ArrowLeft size={16}/> Back
                            </button>
                        )}
                        {step < TOTAL_STEPS ? (
                            <button type="button" onClick={handleNextStep} className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-white bg-cyan-600 hover:bg-cyan-500 transition-colors">
                                Next <ArrowRight size={16}/>
                            </button>
                        ) : (
                            <button type="submit" onClick={handleSubmit} disabled={loading} className="flex items-center justify-center gap-2 w-40 px-4 py-2 rounded-lg font-semibold text-white bg-gradient-to-r from-cyan-500 to-violet-600 shadow-lg hover:opacity-90 disabled:opacity-50 transition-opacity">
                                {loading ? <LoadingSpinner /> : 'Create Account'}
                            </button>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
      </div>
    </div>
  );
}