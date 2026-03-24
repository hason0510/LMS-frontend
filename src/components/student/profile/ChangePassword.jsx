import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { message, Form, Input, Button, Space } from "antd";
import { changePassword } from "../../../api/user";

export default function ChangePassword() {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      await changePassword({
        oldPassword: values.currentPassword,
        newPassword: values.newPassword,
        confirmNewPassword: values.confirmNewPassword,
      });
      message.success(t("profile.doiMatKhauThanhCong"));
      form.resetFields();
    } catch (err) {
      message.error(err.message || t("profile.doiMatKhauThatBai"));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
  };

  return (
    <>
      <div className="flex flex-wrap justify-between items-start gap-4 pb-6 border-b border-black/10 dark:border-white/10">
        <div className="flex min-w-72 flex-col gap-2">
          <p className="text-3xl font-bold tracking-tight text-[#111418] dark:text-white">
            {t("profile.doiMatKhau")}
          </p>
          <p className="text-[#617589] dark:text-gray-400 text-base font-normal leading-normal">
            {t("profile.quanLyMatKhau")}
          </p>
        </div>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        className="py-6 flex flex-col max-w-xl"
      >
        <Form.Item
          label={
            <p className="text-[#111418] dark:text-white text-sm font-medium">
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
            <p className="text-[#111418] dark:text-white text-sm font-medium">
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
            <p className="text-[#111418] dark:text-white text-sm font-medium">
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

      <div className="flex justify-end gap-4 pt-4 border-t border-black/10 dark:border-white/10">
        <Button
          onClick={handleCancel}
          disabled={loading}
          className="h-10 px-6 rounded-lg font-bold"
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
    </>
  );
}
