import React, { useState, useEffect } from "react";
import { Modal, Input, Select, Button, message, Avatar } from "antd";
import { XMarkIcon, CameraIcon } from "@heroicons/react/24/outline";

export default function AdminUserModal({
  open = false,
  mode = "view", // "view", "edit", or "create"
  user = null,
  onClose = () => {},
  onSave = async (data) => {},
}) {
  // Đồng bộ tên trường với UserRequest/UserInfoResponse của backend
  const [formData, setFormData] = useState({
    fullName: "",
    userName: "",
    email: "",
    studentNumber: "",
    phoneNumber: "",
    address: "",
    role: "STUDENT",
    status: "active",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && user && mode !== "create") {
      console.log("Loading user data into form:", user);
      setFormData({
        fullName: user.name || "",
        userName: user.username || "",
        email: user.email || "",
        studentNumber: user.studentNumber || "",
        phoneNumber: user.phoneNumber || "",
        address: user.address || "",
        role: user.role || "STUDENT",
        status: user.status || "active",
      });
    } else {
      setFormData({
        fullName: "",
        userName: "",
        email: "",
        studentNumber: "",
        phoneNumber: "",
        address: "",
        role: "STUDENT",
        status: "active",
      });
    }
  }, [open, user, mode]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      // Validate form data
      if (!formData.fullName) {
        message.error("Vui lòng nhập họ và tên");
        return;
      }
      if (!formData.userName) {
        message.error("Vui lòng nhập tên đăng nhập");
        return;
      }
      if (!formData.email) {
        message.error("Vui lòng nhập email");
        return;
      }

      // Build payload based on mode
      let payload = {};
      if (mode === "create") {
        payload = {
          fullName: formData.fullName,
          userName: formData.userName,
          gmail: formData.email,
          studentNumber: formData.studentNumber || "",
          phoneNumber: formData.phoneNumber || "",
          address: formData.address || "",
          roleName: formData.role,
        };
      } else {
        payload = {
          fullName: formData.fullName,
          gmail: formData.email,
          role: formData.role,
          studentNumber: formData.studentNumber || "",
          phoneNumber: formData.phoneNumber || "",
          address: formData.address || "",
        };
      }

      await onSave(mode === "create" ? null : user?.id, payload);
      
      message.success(mode === "create" ? "Tạo người dùng thành công" : mode === "edit" ? "Cập nhật thành công" : "Thao tác thành công");
      onClose();
    } catch (error) {
      console.error("Error saving user:", error);
      message.error(error.response?.data?.message || error.message || "Thao tác thất bại");
    } finally {
      setLoading(false);
    }
  };

  const title = mode === "view" ? "Chi tiết người dùng" : mode === "edit" ? "Chỉnh sửa thông tin" : "Tạo người dùng mới";

  return (
    <Modal
      title={<span className="text-xl font-bold">{title}</span>}
      open={open}
      onCancel={onClose}
      footer={null}
      width={700}
      centered
      closeIcon={<XMarkIcon className="h-5 w-5" />}
    >
      <div className="py-4 space-y-8">
        {/* User Profile Header */}
        {mode !== "create" && (
          <div className="flex items-center gap-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
            <div className="relative group">
              <Avatar
                size={100}
                src={user?.avatar}
                className="border-4 border-white dark:border-gray-700 shadow-sm"
                alt={formData.fullName}
              >
                {formData.fullName?.charAt(0).toUpperCase()}
              </Avatar>
              {mode === "edit" && (
                <button className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <CameraIcon className="h-6 w-6 text-white" />
                </button>
              )}
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                {formData.fullName || "N/A"}
              </h3>
              <p className="text-gray-500">{formData.email || "Chưa có email"}</p>
              <div className="mt-2 flex gap-2">
                <span className="px-2 py-1 text-xs font-semibold bg-primary/10 text-primary rounded-md">
                  {formData.role}
                </span>
                {mode !== "create" && (
                  <span className={`px-2 py-1 text-xs font-semibold rounded-md ${
                    formData.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {formData.status === 'active' ? 'Hoạt động' : 'Đã khóa'}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Vai trò hệ thống</label>
            <Select
              size="large"
              className="w-full"
              value={formData.role}
              onChange={(value) => handleChange("role", value)}
              disabled={mode === "view"}
              options={[
                { label: "Sinh viên", value: "STUDENT" },
                { label: "Giáo viên", value: "TEACHER" },
                { label: "Quản trị viên", value: "ADMIN" },
              ]}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Họ và Tên <span className="text-red-500">*</span></label>
            <Input
              size="large"
              placeholder="Nguyễn Văn A"
              value={formData.fullName}
              onChange={(e) => handleChange("fullName", e.target.value)}
              disabled={mode === "view"}
            />
          </div>
          {mode === "create" && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Tên đăng nhập <span className="text-red-500">*</span></label>
              <Input
                size="large"
                placeholder="Nhập tên đăng nhập"
                value={formData.userName}
                onChange={(e) => handleChange("userName", e.target.value)}
              />
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Email <span className="text-red-500">*</span></label>
            <Input
              size="large"
              type="email"
              placeholder="example@email.com"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              disabled={mode === "view" || mode === "edit"}
              className={mode === "edit" || mode === "view" ? "bg-gray-50" : ""}
            />
          </div>
          {formData.role === "STUDENT" && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Mã số sinh viên</label>
              <Input
                size="large"
                placeholder="Mã số sinh viên"
                value={formData.studentNumber}
                onChange={(e) => handleChange("studentNumber", e.target.value)}
                disabled={mode === "view"}
              />
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Số điện thoại</label>
            <Input
              size="large"
              placeholder="0912345678"
              value={formData.phoneNumber}
              onChange={(e) => handleChange("phoneNumber", e.target.value)}
              disabled={mode === "view"}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Địa chỉ</label>
            <Input
              size="large"
              placeholder="123 Đường Tran, TP. HCM"
              value={formData.address}
              onChange={(e) => handleChange("address", e.target.value)}
              disabled={mode === "view"}
            />
          </div>
          {mode !== "create" && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Trạng thái</label>
              <Select
                size="large"
                className="w-full"
                value={formData.status}
                onChange={(value) => handleChange("status", value)}
                disabled={mode === "view"}
                options={[
                  { label: "Hoạt động", value: "active" },
                  { label: "Khóa tài khoản", value: "inactive" },
                ]}
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button onClick={onClose} size="large">Đóng</Button>
          {(mode === "edit" || mode === "create") && (
            <Button
              type="primary"
              size="large"
              loading={loading}
              onClick={handleSave}
              className="bg-primary hover:bg-primary/90 min-w-[120px]"
            >
              {mode === "create" ? "Tạo người dùng" : "Lưu thay đổi"}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}