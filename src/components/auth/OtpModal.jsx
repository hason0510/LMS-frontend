import React, { useState, useRef, useEffect } from 'react';
import { Modal, Button, message } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { resendRegisterOtp, verifyOtp } from '../../api/auth';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function OtpModal({ 
  visible, 
  userEmail, 
  userId, 
  onClose,
  onVerified,
  onResend,
  onSuccess,
  title = 'Xác thực OTP',
  successMessage = 'Xác thực OTP thành công!',
  submitText = 'Xác thực OTP',
  loadingText = 'Đang xác thực...',
  expiryMinutes = 5,
  initialResendCountdown = 30,
}) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  // Timer for resend OTP
  useEffect(() => {
    let timer;
    if (resendCountdown > 0) {
      timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  // Auto focus first input when modal opens
  useEffect(() => {
    if (visible) {
      setOtp(['', '', '', '', '', '']);
      setError('');
      setResendCountdown(initialResendCountdown);
      inputRefs.current[0]?.focus();
    }
  }, [initialResendCountdown, visible]);

  const resetModalState = () => {
    setOtp(['', '', '', '', '', '']);
    setError('');
    setLoading(false);
  };

  const handleClose = () => {
    resetModalState();
    onClose();
  };

  const handleOtpChange = (value, index) => {
    // Only allow numbers
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // Take only last character
    setOtp(newOtp);
    setError('');

    // Auto move to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter') {
      handleVerifyOtp();
    }
  };

  const handleVerifyOtp = async () => {
    const otpCode = otp.join('');

    if (otpCode.length !== 6) {
      setError('Vui lòng nhập đầy đủ 6 chữ số');
      return;
    }

    try {
      setLoading(true);
      setError('');

      if (onVerified) {
        await onVerified(otpCode);
        message.success(successMessage);
        resetModalState();
        onSuccess?.();
        handleClose();
        return;
      }

      const response = await verifyOtp(otpCode, userId);
      const payload = response?.data ?? response;

      if (payload?.accessToken) {
        message.success(successMessage);

        const authedUser = await loginUser(payload.accessToken, payload.user);

        setTimeout(() => {
          handleClose();

          if ((authedUser?.role || payload.user?.role) === 'TEACHER') {
            navigate('/teacher/report');
          } else if ((authedUser?.role || payload.user?.role) === 'ADMIN') {
            navigate('/admin/reports');
          } else {
            navigate('/home');
          }
        }, 500);
      }
    } catch (err) {
      setError(err.message || 'Xác thực OTP thất bại. Vui lòng thử lại.');
      message.error(err.message || 'Xác thực OTP thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      setLoading(true);
      setError('');
      if (onResend) {
        await onResend();
      } else {
        await resendRegisterOtp(userEmail);
      }
      message.success('Mã OTP mới đã được gửi đến email của bạn');
      setResendCountdown(30);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError(err.message || 'Không thể gửi lại mã OTP');
      message.error(err.message || 'Không thể gửi lại mã OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={title}
      open={visible}
      onCancel={handleClose}
      footer={null}
      centered
      width={400}
    >
      <div className="flex flex-col gap-6 py-4">
        {/* Email display */}
        <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <ExclamationCircleOutlined className="text-xl text-blue-600 dark:text-blue-400" />
          <div className="flex-1">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Mã xác thực đã được gửi đến:
            </p>
            <p className="font-medium text-gray-900 dark:text-white break-all">
              {userEmail}
            </p>
          </div>
        </div>

        {/* OTP Input */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Nhập mã OTP (6 chữ số)
          </label>
          <div className="flex gap-2 justify-center">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                maxLength="1"
                value={digit}
                onChange={(e) => handleOtpChange(e.target.value, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                className={`w-12 h-12 text-center text-2xl font-bold rounded-lg border-2 transition-colors
                  ${error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
                  focus:outline-none focus:border-primary dark:bg-gray-800 dark:text-white`}
              />
            ))}
          </div>
          {error && (
            <p className="text-red-500 text-sm mt-2">{error}</p>
          )}
        </div>

        {/* Info message */}
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          Mã OTP sẽ hết hạn sau {expiryMinutes} phút
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          <Button
            type="primary"
            size="large"
            block
            loading={loading}
            onClick={handleVerifyOtp}
            disabled={loading}
            className="h-11 font-semibold"
          >
            {loading ? loadingText : submitText}
          </Button>

          <button
            type="button"
            onClick={handleResendOtp}
            disabled={resendCountdown > 0 || loading}
            className={`py-2 px-4 rounded-lg font-medium transition-colors text-sm
              ${resendCountdown > 0 || loading
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-primary hover:text-primary/80'
              }`}
          >
            {resendCountdown > 0 
              ? `Gửi lại mã trong ${resendCountdown}s` 
              : 'Gửi lại mã OTP'
            }
          </button>
        </div>
      </div>
    </Modal>
  );
}
