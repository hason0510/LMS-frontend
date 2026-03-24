import React, { useState, useRef, useEffect } from 'react';
import { Modal, Input, Button, message, Spin } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { verifyOtp } from '../../api/auth';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function OtpModal({ 
  visible, 
  userEmail, 
  userId, 
  onClose,
  userData 
}) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  console.log('OtpModal render - visible:', visible, 'userId:', userId, 'userEmail:', userEmail);

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
      inputRefs.current[0]?.focus();
    }
  }, [visible]);

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

      const response = await verifyOtp(otpCode, userId);
      console.log('OTP verification response:', response);

      if (response.data && response.data.accessToken) {
        message.success('Xác thực OTP thành công!');
        
        // Login user with response data
        loginUser(response.data.accessToken, response.data.user);

        // Delay before redirect to show success message
        setTimeout(() => {
          onClose();
          
          // Redirect based on user role
          if (response.data.user?.role === 'TEACHER') {
            navigate('/teacher/dashboard');
          } else if (response.data.user?.role === 'ADMIN') {
            navigate('/admin/dashboard');
          } else {
            navigate('/home');
          }
        }, 500);
      }
    } catch (err) {
      console.error('OTP verification error:', err);
      setError(err.message || 'Xác thực OTP thất bại. Vui lòng thử lại.');
      message.error(err.message || 'Xác thực OTP thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    // TODO: Implement resend OTP API call
    message.info('Mã OTP mới sẽ được gửi đến email của bạn');
    setResendCountdown(60);
    setOtp(['', '', '', '', '', '']);
    inputRefs.current[0]?.focus();
  };

  return (
    <Modal
      title="Xác thực OTP"
      open={visible}
      onCancel={onClose}
      footer={null}
      centered
      width={400}
      closable={false}
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
          Mã OTP sẽ hết hạn sau 10 phút
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          <Button
            type="primary"
            size="large"
            block
            loading={loading}
            onClick={handleVerifyOtp}
            disabled={resendCountdown > 0}
            className="h-11 font-semibold"
          >
            {loading ? 'Đang xác thực...' : 'Xác thực OTP'}
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
