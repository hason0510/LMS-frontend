import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { message, Form, Input, Button } from "antd";
import { changePassword, confirmChangePassword, resendChangePasswordOtp } from "../../../api/user";
import OtpModal from "../../auth/OtpModal";
import { useAuth } from "../../../contexts/AuthContext";

export default function ChangePassword() {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [pendingPasswordData, setPendingPasswordData] = useState(null);
  const { user } = useAuth();

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const passwordData = {
        oldPassword: values.currentPassword,
        newPassword: values.newPassword,
        confirmNewPassword: values.confirmNewPassword,
      };
      await changePassword(passwordData);
      setPendingPasswordData(passwordData);
      setShowOtpModal(true);
      message.success(t("profile.otpDaDuocGui"));
    } catch (err) {
      message.error(err.message || t("profile.doiMatKhauThatBai"));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
  };

  const handleConfirmPasswordChange = async (otpCode) => {
    await confirmChangePassword({
      ...pendingPasswordData,
      otp: otpCode,
    });
  };

  const handlePasswordChangeSuccess = () => {
    form.resetFields();
    setPendingPasswordData(null);
    setShowOtpModal(false);
  };

  const handleCloseOtpModal = () => {
    setShowOtpModal(false);
    setPendingPasswordData(null);
  };

  return (
    <>
      <div className="flex flex-wrap justify-between items-start gap-4 pb-5 border-b border-black/10 dark:border-white/10">
        <div className="flex min-w-72 flex-col gap-2">
          <p className="!mb-1 text-3xl font-bold tracking-tight text-[#111418] dark:text-white">
            {t("profile.doiMatKhau")}
          </p>
          <p className="!mb-1 text-base font-normal leading-normal text-[#617589] dark:text-gray-400">
            {t("profile.quanLyMatKhau")}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          className="flex max-w-xl flex-col"
        >
          <Form.Item
            label={
              <p className="!mb-0 text-sm font-medium text-[#111418] dark:text-white">
                {t("profile.matKhauHienTai")}
              </p>
            }
            name="currentPassword"
            rules={[
              {
                required: true,
                message: t("profile.vuiLongNhapMatKhauHienTai"),
              },
            ]}
          >
            <Input.Password
              placeholder={t("profile.nhapMatKhauHienTai")}
              className="rounded-lg h-10"
            />
          </Form.Item>

          <Form.Item
            label={
              <p className="!mb-0 text-sm font-medium text-[#111418] dark:text-white">
                {t("profile.matKhauMoi")}
              </p>
            }
            name="newPassword"
            rules={[
              {
                required: true,
                message: t("profile.vuiLongNhapMatKhauMoi"),
              },
              {
                min: 6,
                message: t("profile.matKhauMoiToi6KyTu"),
              },
            ]}
          >
            <Input.Password
              placeholder={t("profile.nhapMatKhauMoi")}
              className="rounded-lg h-10"
            />
          </Form.Item>

          <Form.Item
            label={
              <p className="!mb-0 text-sm font-medium text-[#111418] dark:text-white">
                {t("profile.xacNhanMatKhauMoi")}
              </p>
            }
            name="confirmNewPassword"
            dependencies={["newPassword"]}
            rules={[
              {
                required: true,
                message: t("profile.vuiLongXacNhanMatKhauMoi"),
              },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("newPassword") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(
                    new Error(t("profile.matKhauKhongKhop"))
                  );
                },
              }),
            ]}
          >
            <Input.Password
              placeholder={t("profile.nhapLaiMatKhauMoi")}
              className="rounded-lg h-10"
            />
          </Form.Item>
        </Form>
      </div>

      <div className="flex justify-end gap-4 pt-4 border-t border-black/10 dark:border-white/10">
        <Button
          onClick={handleCancel}
          disabled={loading}
          className="h-10 px-6 rounded-lg"
        >
          {t("profile.huy")}
        </Button>
        <Button
          type="primary"
          htmlType="submit"
          onClick={() => form.submit()}
          disabled={loading}
          loading={loading}
          className="h-10 px-6 rounded-lg font-bold"
        >
          {loading ? t("profile.dangLuu") : t("profile.luuThayDoi")}
        </Button>
      </div>

      <OtpModal
        visible={showOtpModal}
        userEmail={user?.gmail || user?.email || user?.userName || ""}
        onClose={handleCloseOtpModal}
        onVerified={handleConfirmPasswordChange}
        onResend={resendChangePasswordOtp}
        onSuccess={handlePasswordChangeSuccess}
        title={t("profile.xacThucOtpDoiMatKhau")}
        successMessage={t("profile.doiMatKhauThanhCong")}
        submitText={t("profile.xacNhanDoiMatKhau")}
        loadingText={t("profile.dangXacThucOtp")}
      />
    </>
  );
}
