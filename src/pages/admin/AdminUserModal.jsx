import React, { useState, useEffect } from "react";
import { Modal, Input, Select, Button, message } from "antd";
import { XMarkIcon } from "@heroicons/react/24/outline";
import UserIdentity from "../../components/common/UserIdentity";
import { useAuth } from "../../contexts/AuthContext";

const ROLE_LABELS = {
  STUDENT: "Người học",
  TEACHER: "Giảng viên",
  ADMIN: "Quản trị viên",
};

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
    birthday: "",
    workPlace: "",
    joinDate: "",
    fieldOfExpertise: "",
    bio: "",
  });
  const [loading, setLoading] = useState(false);
  const { user: authUser } = useAuth();
  const isSelf = mode === "edit" && user?.id != null && user?.id === authUser?.id;

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
        birthday: user.birthday ? new Date(user.birthday).toISOString().split('T')[0] : "",
        workPlace: user.workPlace || "",
        joinDate: user.joinDate ? new Date(user.joinDate).toISOString().split('T')[0] : "",
        fieldOfExpertise: user.fieldOfExpertise || "",
        bio: user.bio || "",
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
        birthday: "",
        workPlace: "",
        joinDate: "",
        fieldOfExpertise: "",
        bio: "",
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
        message.error("Vui lòng nhập họ tên");
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
          birthday: formData.birthday || null,
          workPlace: formData.role === "TEACHER" ? formData.workPlace : null,
          joinDate: formData.role === "TEACHER" ? (formData.joinDate || null) : null,
          fieldOfExpertise: formData.role === "TEACHER" ? formData.fieldOfExpertise : null,
          bio: formData.role === "TEACHER" ? formData.bio : null,
        };
      } else {
        payload = {
          fullName: formData.fullName,
          gmail: formData.email,
          role: formData.role,
          studentNumber: formData.studentNumber || "",
          phoneNumber: formData.phoneNumber || "",
          address: formData.address || "",
          birthday: formData.birthday || null,
          workPlace: formData.role === "TEACHER" ? formData.workPlace : null,
          joinDate: formData.role === "TEACHER" ? (formData.joinDate || null) : null,
          fieldOfExpertise: formData.role === "TEACHER" ? formData.fieldOfExpertise : null,
          bio: formData.role === "TEACHER" ? formData.bio : null,
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
          <div className="flex items-center gap-6 rounded-2xl bg-gray-50 p-4 dark:bg-gray-800/50">
            <UserIdentity
              user={user}
              secondaryText={formData.email || "Chưa có email"}
              avatarSizeClass="size-24"
              avatarInitialsClass="text-3xl"
              nameClassName="m-0 text-2xl font-bold text-gray-900 dark:text-white"
              secondaryClassName="m-0 text-sm text-gray-500 dark:text-gray-400"
              appendNameNode={
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                    {ROLE_LABELS[formData.role] || formData.role}
                  </span>
                  <span
                    className={`rounded-md px-2 py-1 text-xs font-semibold ${
                      formData.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}
                  >
                    {formData.status === "active" ? "Hoạt động" : "Đã khóa"}
                  </span>
                </div>
              }
            />
          </div>
        )}

        {/* Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col !gap-2 md:col-span-2">
            <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Vai trò hệ thống</label>
            <Select
              size="large"
              className="w-full"
              value={formData.role}
              onChange={(value) => handleChange("role", value)}
              disabled={mode === "view" || isSelf}
              showSearch
              optionFilterProp="label"
              options={[
                { label: "Người học", value: "STUDENT" },
                { label: "Giảng viên", value: "TEACHER" },
                { label: "Quản trị viên", value: "ADMIN" },
              ]}
            />
            {isSelf && (
              <p className="m-0 text-xs text-amber-600 dark:text-amber-400">
                Bạn không thể tự thay đổi vai trò của mình.
              </p>
            )}
          </div>
          <div className="flex flex-col !gap-2">
            <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Họ tên <span className="text-red-500">*</span></label>
            <Input
              size="large"
              placeholder="Nguyễn Văn A"
              value={formData.fullName}
              onChange={(e) => handleChange("fullName", e.target.value)}
              disabled={mode === "view"}
            />
          </div>
          {mode === "create" && (
            <div className="flex flex-col !gap-2">
              <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Tên đăng nhập <span className="text-red-500">*</span></label>
              <Input
                size="large"
                placeholder="Nhập tên đăng nhập"
                value={formData.userName}
                onChange={(e) => handleChange("userName", e.target.value)}
              />
            </div>
          )}
          <div className="flex flex-col !gap-2">
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
            <div className="flex flex-col !gap-2">
              <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Mã số người học</label>
              <Input
                size="large"
                placeholder="Mã số người học"
                value={formData.studentNumber}
                onChange={(e) => handleChange("studentNumber", e.target.value)}
                disabled={mode === "view"}
              />
            </div>
          )}
          <div className="flex flex-col !gap-2">
            <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Số điện thoại</label>
            <Input
              size="large"
              placeholder="0912345678"
              value={formData.phoneNumber}
              onChange={(e) => handleChange("phoneNumber", e.target.value)}
              disabled={mode === "view"}
            />
          </div>
          <div className="flex flex-col !gap-2">
            <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Ngày sinh</label>
            <Input
              type="date"
              size="large"
              value={formData.birthday}
              onChange={(e) => handleChange("birthday", e.target.value)}
              disabled={mode === "view"}
            />
          </div>
          <div className="flex flex-col !gap-2 md:col-span-2">
            <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Địa chỉ</label>
            <Input
              size="large"
              placeholder="123 Đường Tran, TP. HCM"
              value={formData.address}
              onChange={(e) => handleChange("address", e.target.value)}
              disabled={mode === "view"}
            />
          </div>

          {formData.role === "TEACHER" && (
            <>
              <div className="md:col-span-2 mt-4 relative">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-gray-200 dark:border-gray-700" />
                </div>
                <div className="relative flex justify-start">
                  <span className="bg-white dark:bg-[#111418] pr-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    THÔNG TIN GIẢNG VIÊN
                  </span>
                </div>
              </div>
              <div className="flex flex-col !gap-2">
                <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Nơi công tác</label>
                <Input
                  size="large"
                  placeholder="Ví dụ: Trường Đại học ABC"
                  value={formData.workPlace}
                  onChange={(e) => handleChange("workPlace", e.target.value)}
                  disabled={mode === "view"}
                />
              </div>
              <div className="flex flex-col !gap-2">
                <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Ngày vào làm</label>
                <Input
                  type="date"
                  size="large"
                  value={formData.joinDate}
                  onChange={(e) => handleChange("joinDate", e.target.value)}
                  disabled={mode === "view"}
                />
              </div>
              <div className="flex flex-col !gap-2 md:col-span-2">
                <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Lĩnh vực chuyên môn</label>
                <Input
                  size="large"
                  placeholder="Ví dụ: Lập trình Web, Toán học"
                  value={formData.fieldOfExpertise}
                  onChange={(e) => handleChange("fieldOfExpertise", e.target.value)}
                  disabled={mode === "view"}
                />
              </div>
              <div className="flex flex-col !gap-2 md:col-span-2">
                <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Giới thiệu về bản thân</label>
                <Input.TextArea
                  rows={4}
                  size="large"
                  placeholder="Chia sẻ thêm về bản thân, kinh nghiệm và những điều bạn đam mê..."
                  value={formData.bio}
                  onChange={(e) => handleChange("bio", e.target.value)}
                  disabled={mode === "view"}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-6">
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
