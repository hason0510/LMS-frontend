import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import LoginForm from '../../components/auth/LoginForm'
import RegisterForm from '../../components/auth/RegisterForm'

export default function AuthPage({ defaultTab = 'login' }) {
  const [tab, setTab] = useState(defaultTab)
  const { t } = useTranslation()

  return (
    <div className="min-h-screen flex items-stretch bg-background-light dark:bg-background-dark">
      <div className="hidden lg:flex lg:col-span-3 items-center justify-center p-8 bg-primary/10 dark:bg-primary/20 w-0 lg:w-2/3">
        <div className="flex flex-col gap-8 w-full max-w-lg text-center">
          <div className="w-full bg-center bg-no-repeat aspect-square bg-cover rounded-xl" style={{backgroundImage: 'url(https://lh3.googleusercontent.com/aida-public/AB6AXuA06DoYKuPcnhc8Ipab5MWiFJtn7rJiFELCiJD1wj6QxYoZF4X0FuWi7E6gMpdfusDBRHm9gl1RMY4m51NPBn-IizZ2u_KL3O3gYKPHjX5WgcS0hX5AQFWRJzmyqMdEPcCcC9_zt2hz52GDQMhSTjNLa7OVP_tTHSTe0ndXotgp6wwOS3zMneQUeyojjvcwcqi8BmykHOyVsavlTHeCtLqu6vAcFl6bkfEu-5Fs3HVidJqvREqrE1UcaOykFeEDvYAPTClH2dlqP6M)' }} />
          <div className="flex flex-col gap-2 px-2">
            <h1 className="text-[#111418] dark:text-white text-4xl font-bold leading-tight tracking-tighter">{t('auth.batDauHanhTrinhHoc')}</h1>
            <h2 className="text-[#617589] dark:text-gray-300 text-base">{t('auth.phatiTrienTiemNang')}</h2>
          </div>
        </div>
      </div>

      <div className="flex flex-col justify-center items-center w-full lg:w-1/3 p-6 sm:p-8">
        <div className="flex flex-col gap-6 w-full max-w-md">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-3xl">school</span>
            <p className="text-xl font-bold text-[#111418] dark:text-white">LearnOnline</p>
          </div>

          <div className="flex flex-col gap-2 text-left">
            <h1 className="text-[#111418] dark:text-white text-3xl font-bold">
              {tab === 'login' ? t('auth.chaoMung') : t('auth.taoTaiKhoan')}
            </h1>
            <h2 className="text-[#617589] dark:text-gray-300 text-base">
              {tab === 'login' ? t('auth.dangnhapDetiepTuc') : t('auth.dangkiDeHocdungCung')}
            </h2>
          </div>

          <div className="flex h-12 w-full items-center justify-center rounded-lg bg-background-light dark:bg-white/10 p-1.5">
            <button onClick={() => setTab('login')} className={`flex h-full grow items-center justify-center px-2 rounded-md text-sm font-medium ${tab === 'login' ? 'bg-white dark:bg-primary text-[#111418] dark:text-white shadow-sm' : 'text-[#617589] dark:text-gray-300'}`}>{t('auth.dangNhap')}</button>
            <button onClick={() => setTab('register')} className={`flex h-full grow items-center justify-center px-2 rounded-md text-sm font-medium ${tab === 'register' ? 'bg-white dark:bg-primary text-[#111418] dark:text-white shadow-sm' : 'text-[#617589] dark:text-gray-300'}`}>{t('auth.dangKy')}</button>
          </div>

          {tab === 'login' ? <LoginForm /> : <RegisterForm />}

        </div>
      </div>
    </div>
  )
}
