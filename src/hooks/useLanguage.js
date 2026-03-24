import { useTranslation } from 'react-i18next';

export function useLanguage() {
  const { i18n } = useTranslation();

  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('i18nextLng', lang);
  };

  const getCurrentLanguage = () => {
    return localStorage.getItem('i18nextLng') || i18n.language || 'vi';
  };

  return {
    changeLanguage,
    getCurrentLanguage,
    i18n,
  };
}
