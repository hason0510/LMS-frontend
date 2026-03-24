import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { UserIcon, EnvelopeIcon, LockClosedIcon, AcademicCapIcon } from '@heroicons/react/24/outline'
import { register } from '../../api/auth'
import { useAuth } from '../../contexts/AuthContext'
import OtpModal from './OtpModal'

export default function RegisterForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { loginUser } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'STUDENT'
  });
  
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [registeredUserId, setRegisteredUserId] = useState(null);

  const validateField = (name, value) => {
    let error = '';
    switch (name) {
      case 'username':
        if (!value.trim()) error = t('auth.vuilongNhapTenDangNhap');
        break;
      case 'fullName':
        if (!value.trim()) error = t('auth.vuilongNhapHoVaTen');
        break;
      case 'email':
        if (!value.trim()) error = t('auth.vuilongNhapEmail');
        else if (!/\S+@\S+\.\S+/.test(value)) error = t('auth.emailKhongHopLe');
        break;
      case 'password':
        if (!value) error = t('auth.vuilongNhapMatKhau');
        else if (value.length < 6) error = t('auth.matKhauToi6KyTu');
        break;
      case 'confirmPassword':
        if (!value) error = t('auth.vuilongXacNhanMatKhau');
        else if (formData.password && value !== formData.password) error = t('auth.matKhauKhongKhop');
        break;
      default:
        break;
    }
    return error;
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    const error = validateField(name, value);
    if (error) {
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (apiError) setApiError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    
    Object.keys(formData).forEach(key => {
      if (key === 'role') return;
      const error = validateField(key, formData[key]);
      if (error) newErrors[key] = error;
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    setApiError('');

    try {
      const roleName = formData.role === 'STUDENT' ? 'STUDENT' : 'TEACHER';
      const requestData = {
        userName: formData.username,
        fullName: formData.fullName,
        gmail: formData.email,
        password: formData.password,
        roleName: roleName,
        phoneNumber: "",
        address: "",
        birthday: "",
        studentNumber: ""
      };

      console.log('Register request data:', requestData);

      const res = await register(requestData);
      console.log('Registration response:', res);
      
      // After successful registration, show OTP modal
      if (res.data && res.data.userId) {
        console.log('Setting showOtpModal to true with userId:', res.data.userId);
        setRegisteredUserId(res.data.userId);
        setShowOtpModal(true);
      } else if (res.userId) {
        console.log('Setting showOtpModal to true with userId:', res.userId);
        setRegisteredUserId(res.userId);
        setShowOtpModal(true);
        // Alternative structure
        setRegisteredUserId(res.userId);
        setShowOtpModal(true);
      } else {
        // Fallback: if no userId in response, navigate to login
        setApiError(t('auth.dangKyThanhCong'));
        setTimeout(() => navigate('/login'), 2000);
      }
    } catch (err) {
      setApiError(err.message || t('auth.dangKyThatBai'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="w-full max-w-md flex flex-col gap-4" onSubmit={handleSubmit}>
      {apiError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{apiError}</span>
        </div>
      )}

      <div className="flex flex-col w-full">
        <p className="text-[#111418] dark:text-gray-200 text-sm font-medium pb-2">{t('auth.tenDangNhap')} <span className="text-red-500">*</span></p>
        <div className={`input-group w-full ${errors.username ? '!border-red-500' : ''}`}>
          <div className={`icon-area border-r border-[#dbe0e6] dark:border-gray-600 ${errors.username ? '!border-red-500' : ''}`}>
            <UserIcon className="h-5 w-5" />
          </div>
          <input 
            name="username"
            value={formData.username}
            onChange={handleChange}
            onBlur={handleBlur}
            className="form-input flex w-full" 
            placeholder={t('auth.nhapTenDangNhap')} 
          />
        </div>
        {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username}</p>}
      </div>

      <div className="flex flex-col w-full">
        <p className="text-[#111418] dark:text-gray-200 text-sm font-medium pb-2">{t('auth.hoVaTen')} <span className="text-red-500">*</span></p>
        <div className={`input-group w-full ${errors.fullName ? '!border-red-500' : ''}`}>
          <div className={`icon-area border-r border-[#dbe0e6] dark:border-gray-600 ${errors.fullName ? '!border-red-500' : ''}`}>
            <UserIcon className="h-5 w-5" />
          </div>
          <input 
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`form-input flex w-full`} 
            placeholder={t('auth.nhapHoVaTen')} 
          />
        </div>
        {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
      </div>

      <div className="flex flex-col w-full">
        <p className="text-[#111418] dark:text-gray-200 text-sm font-medium pb-2">{t('auth.email')} <span className="text-red-500">*</span></p>
        <div className={`input-group w-full ${errors.email ? '!border-red-500' : ''}`}>
          <div className={`icon-area border-r border-[#dbe0e6] dark:border-gray-600 ${errors.email ? '!border-red-500' : ''}`}>
            <EnvelopeIcon className="h-5 w-5" />
          </div>
          <input 
            name="email"
            value={formData.email}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`form-input flex w-full`} 
            placeholder={t('auth.nhapEmail')} 
          />
        </div>
        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
      </div>

      <div className="flex flex-col w-full">
        <p className="text-[#111418] dark:text-gray-200 text-sm font-medium pb-2">{t('auth.matKhau')} <span className="text-red-500">*</span></p>
        <div className={`input-group w-full ${errors.password ? '!border-red-500' : ''}`}>
          <div className={`icon-area border-r border-[#dbe0e6] dark:border-gray-600 ${errors.password ? '!border-red-500' : ''}`}>
            <LockClosedIcon className="h-5 w-5" />
          </div>
          <input 
            type="password" 
            name="password"
            value={formData.password}
            onChange={handleChange}
            onBlur={handleBlur}
            className="form-input flex w-full" 
            placeholder={t('auth.nhapMatKhau')} 
          />
        </div>
        {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
      </div>

      <div className="flex flex-col w-full">
        <p className="text-[#111418] dark:text-gray-200 text-sm font-medium pb-2">{t('auth.xacNhanMatKhau')} <span className="text-red-500">*</span></p>
        <div className={`input-group w-full ${errors.confirmPassword ? '!border-red-500' : ''}`}>
          <div className={`icon-area border-r border-[#dbe0e6] dark:border-gray-600 ${errors.confirmPassword ? '!border-red-500' : ''}`}>
            <LockClosedIcon className="h-5 w-5" />
          </div>
          <input 
            type="password" 
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`form-input flex w-full`} 
            placeholder={t('auth.nhapLaiMatKhau')} 
          />
        </div>
        {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
      </div>

      <div className="flex flex-col w-full">
        <p className="text-[#111418] dark:text-gray-200 text-sm font-medium pb-2">{t('auth.vaiTro')} <span className="text-red-500">*</span></p>
        <div className="flex items-center gap-6 px-1">
          <label className="flex items-center gap-2 cursor-pointer group">
            <div className="relative flex items-center">
              <input 
                type="radio" 
                name="role" 
                value="STUDENT" 
                checked={formData.role === 'STUDENT'} 
                onChange={handleChange}
                className="peer h-4 w-4 cursor-pointer appearance-none rounded-full border border-slate-300 checked:border-primary checked:bg-primary transition-all"
              />
              <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <span className="text-[#111418] dark:text-gray-200 text-sm group-hover:text-primary transition-colors">{t('auth.sinhVien')}</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer group">
            <div className="relative flex items-center">
              <input 
                type="radio" 
                name="role" 
                value="TEACHER" 
                checked={formData.role === 'TEACHER'} 
                onChange={handleChange}
                className="peer h-4 w-4 cursor-pointer appearance-none rounded-full border border-slate-300 checked:border-primary checked:bg-primary transition-all"
              />
              <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <span className="text-[#111418] dark:text-gray-200 text-sm group-hover:text-primary transition-colors">{t('auth.giaoVien')}</span>
          </label>
        </div>
      </div>

      <button type="submit" className="btn btn-primary w-full text-base font-bold" disabled={loading}>
        {loading ? t('auth.dangDangKy') : t('auth.dangKy')}
      </button>

      <p className="text-center text-sm text-[#617589] dark:text-gray-400">
        {t('auth.thoaThuan')} <a className="font-medium text-primary hover:underline" href="#">{t('auth.đieuKhoanDichVu')}</a>.
      </p>

      {/* OTP Modal */}
      <OtpModal 
        visible={showOtpModal}
        userEmail={formData.email}
        userId={registeredUserId}
        userData={formData}
        onClose={() => {
          setShowOtpModal(false);
          setRegisteredUserId(null);
        }}
      />
    </form>
  )
}
