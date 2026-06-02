import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../contexts/AuthContext";
import { EyeIcon, LockClosedIcon, UserIcon } from "@heroicons/react/24/outline";
import { login, googleLogin } from "../../api/auth";
import { GoogleLogin } from "@react-oauth/google";
import ModalNotification from "../common/ModalNotification";

const ACCOUNT_LOCKED_ERROR = "ACCOUNT_LOCKED";
const ACCOUNT_LOCKED_MESSAGE = "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ với quản trị viên để biết thêm chi tiết.";

export default function LoginForm() {
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { loginUser } = useAuth();

  const getRedirectPathForRole = (role) => {
    const normalized = String(role || "").toUpperCase();
    if (normalized === "TEACHER") return "/teacher/dashboard";
    if (normalized === "ADMIN") return "/admin/dashboard";
    return "/home";
  };

  useEffect(() => {
    if (searchParams.get("locked") === "1") {
      setError(ACCOUNT_LOCKED_MESSAGE);
      setShowModal(true);
    }
  }, [searchParams]);

  const closeModal = () => {
    setShowModal(false);
    if (searchParams.get("locked") === "1") {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("locked");
      setSearchParams(nextParams, { replace: true });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await login(username, password);
      console.log("Login response:", res);

      const payload = res?.data ?? res;
      const accessToken = payload?.accessToken;
      const loginData = payload?.user;

      if (!accessToken) {
        throw new Error("Missing access token from login response");
      }

      const authedUser = await loginUser(accessToken, loginData);
      setLoading(false);
      navigate(getRedirectPathForRole(authedUser?.role || loginData?.role || loginData?.roleName), { replace: true });
    } catch (err) {
      const errorKey = err?.response?.data?.message;
      setError(errorKey === ACCOUNT_LOCKED_ERROR ? ACCOUNT_LOCKED_MESSAGE : t('auth.dangNhapThatBai'));
      setLoading(false);
      setShowModal(true);
    }
  };

  const handleGoogleLogin = async (credentialResponse) => {
    setError("");
    setLoading(true);
    try {
      const res = await googleLogin(credentialResponse);
      const payload = res?.data ?? res;
      const accessToken = payload?.accessToken;
      const loginData = payload?.user;

      if (!accessToken) {
        throw new Error("Missing access token from google login response");
      }

      const authedUser = await loginUser(accessToken, loginData);
      setLoading(false);
      navigate(getRedirectPathForRole(authedUser?.role || loginData?.role || loginData?.roleName), { replace: true });
    } catch (err) {
      const errorKey = err?.response?.data?.message;
      setError(errorKey === ACCOUNT_LOCKED_ERROR ? ACCOUNT_LOCKED_MESSAGE : t('auth.googleLoginThatBai'));
      setLoading(false);
      setShowModal(true);
    }
  };

  const handleGoogleError = () => {
    setError(t('auth.googleErrorXayRa'));
    setShowModal(true);
  };

  return (
    <>
      {/* Hiển thị thông báo lỗi đăng nhập màu đỏ */}
      <form
        className="w-full max-w-md flex flex-col gap-4"
        onSubmit={handleSubmit}
      >
        <div className="flex flex-col w-full">
          <p className="text-[#111418] dark:text-gray-200 text-sm font-medium mb-2">
            {t('auth.emailHoacTenDangNhap')}
          </p>
          <div className="input-group w-full">
            <div className="icon-area border-r border-[#dbe0e6] dark:border-gray-600">
              <UserIcon className="h-5 w-5" />
            </div>
            <input
              className="form-input flex w-full min-w-0 flex-1"
              placeholder={t('auth.nhapEmailHoacTenDangNhap')}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="flex flex-col w-full">
{/*          <div className="flex justify-between items-center mb-1">
            <p className="text-[#111418] dark:text-gray-200 text-sm font-medium">
              {t('auth.matKhau')}
            </p>
            <a
              className="text-primary text-sm font-medium hover:underline"
              href="#"
            >
              {t('auth.quenMatKhau')}
            </a>
          </div>*/}
          <div className="flex justify-between items-baseline mb-1 w-full">
            <p className="text-[#111418] dark:text-gray-200 text-sm font-medium leading-none">
              {t('auth.matKhau')}
            </p>
            <a
                className="text-primary text-sm font-medium hover:underline leading-none"
                href="#"
            >
              {t('auth.quenMatKhau')}
            </a>
          </div>
          <div className="input-group w-full">
            <div className="icon-area border-r border-[#dbe0e6] dark:border-gray-600">
              <LockClosedIcon className="h-5 w-5" />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              className="form-input flex w-full min-w-0 flex-1"
              placeholder={t('auth.nhapMatKhau')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="icon-area cursor-pointer"
              aria-label="toggle password visibility"
              onClick={() => setShowPassword((v) => !v)}
            >
              <EyeIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {error && (
          <div className="text-red-500 text-sm font-medium text-center mb-2">
            {error}
          </div>
        )}

        <button
          className="btn btn-primary w-full text-base font-bold"
          type="submit"
          disabled={loading}
        >
          {loading ? t('auth.dangDangNhap') : t('auth.dangNhap')}
        </button>

        <div className="flex items-center gap-3">
          <hr className="flex-grow border-t border-[#dbe0e6] dark:border-gray-700" />
          <span className="text-[#617589] dark:text-gray-400 text-sm">
            {t('auth.dangNhapVoi')}
          </span>
          <hr className="flex-grow border-t border-[#dbe0e6] dark:border-gray-700" />
        </div>

        <div className="w-full flex items-center justify-center">
          <GoogleLogin
              onSuccess={handleGoogleLogin}
              onError={handleGoogleError}
              locale="vi_VN"
              theme="outline"
              size="large"
          />
        </div>

        <p className="text-center text-sm text-[#617589] dark:text-gray-400">
          {t('auth.thoaThuan')}{" "}
          <a className="font-medium text-primary hover:underline" href="#">
            {t('auth.đieuKhoanDichVu')}
          </a>{" "}
          {t('auth.va')}{" "}
          <a className="font-medium text-primary hover:underline" href="#">
            {t('auth.chinhSachBaoMat')}
          </a>
          .
        </p>
      </form>
      <ModalNotification
        open={showModal}
        title={error === ACCOUNT_LOCKED_MESSAGE ? "Tài khoản bị khóa" : "Đăng nhập thất bại"}
        message={error}
        onClose={closeModal}
      />
    </>
  );
}
