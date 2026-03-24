import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { CameraIcon, PencilIcon } from "@heroicons/react/24/solid";
import { Input, InputNumber, Button, Space, DatePicker, message } from "antd";
import dayjs from "dayjs";
import { updateUser, uploadUserAvatar } from "../../../api/user";
import { useAuth } from "../../../contexts/AuthContext";
import useUserStore from "../../../store/useUserStore";

export default function MyInformation({
  userData,
  isLoading: parentLoading,
  onUpdate,
}) {
  const { t } = useTranslation();
  const user = useUserStore((state) => state.user);
  const updateUserStoreData = useUserStore((state) => state.updateUser);
  const [isEditing, setIsEditing] = useState(false);
  const [initialData, setInitialData] = useState(null);
  const [formData, setFormData] = useState({
    fullName: "",
    gmail: "",
    phoneNumber: "",
    birthday: "",
    address: "",
    workPlace: "",
    yearsOfExperience: "",
    fieldOfExpertise: "",
    bio: "",
  });
  const [loading, setLoading] = useState(parentLoading || true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  // Initialize form data from userData prop
  useEffect(() => {
    if (userData) {
      setInitialData(userData);
      setFormData({
        fullName: userData.fullName || "",
        gmail: userData.gmail || "",
        phoneNumber: userData.phoneNumber || "",
        birthday: userData.birthday || "",
        address: userData.address || "",
        workPlace: userData.workPlace || "",
        yearsOfExperience: userData.yearsOfExperience || "",
        fieldOfExpertise: userData.fieldOfExpertise || "",
        bio: userData.bio || "",
      });
      console.log("User Data in MyInformation:", userData);
      // Map image_uri from backend to avatar for display
      setAvatarPreview(userData.imageUrl);
      setLoading(false);
    }
  }, [userData]);

  // Update loading state from parent
  useEffect(() => {
    setLoading(parentLoading);
  }, [parentLoading]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAntdChange = (fieldName, value) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      if (!user?.id) {
        throw new Error("User ID not found");
      }

      const updatedUser = await updateUser(user.id, {
        ...formData,
        userName: initialData?.userName, // Keep username as is
      });

      if (avatarFile) {
        await uploadUserAvatar(user.id, avatarFile);
        // Update avatar in updatedUser data if needed, or fetch user again
        // For now, we assume the avatar upload is successful and the preview is correct
      }

      const fullUserData = updatedUser.data || updatedUser;
      setInitialData(fullUserData);
      if (onUpdate) {
        onUpdate(fullUserData);
      }

      // Update Zustand store with new user data
      updateUserStoreData({
        fullName: fullUserData.fullName,
        gmail: fullUserData.gmail,
        phoneNumber: fullUserData.phoneNumber,
        birthday: fullUserData.birthday,
        address: fullUserData.address,
        imageUrl: fullUserData.imageUrl,
        userName: fullUserData.userName,
        roleName: fullUserData.roleName,
      });

      setSuccess("Cập nhật thông tin thành công!");
      setIsEditing(false);
      setAvatarFile(null);
      // Auto-hide success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Cập nhật thất bại. Vui lòng thử lại.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (initialData) {
      setFormData({
        fullName: initialData.fullName || "",
        gmail: initialData.gmail || "",
        phoneNumber: initialData.phoneNumber || "",
        birthday: initialData.birthday || "",
        address: initialData.address || "",
        workPlace: initialData.workPlace || "",
        yearsOfExperience: initialData.yearsOfExperience || "",
        fieldOfExpertise: initialData.fieldOfExpertise || "",
        bio: initialData.bio || "",
      });
      setAvatarPreview(initialData.avatar || initialData.image_url || null);
      setAvatarFile(null);
    }
    setIsEditing(false);
    setError("");
    setSuccess("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
          <p className="text-[#617589] dark:text-gray-400">
            {t("profile.dangTaiThongTin")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap justify-between items-start gap-4 pb-6 border-b border-black/10 dark:border-white/10">
        <div className="flex min-w-72 flex-col gap-2">
          <p className="text-3xl font-bold tracking-tight text-[#111418] dark:text-white">
            {t("profile.thongTinCaNhan")}
          </p>
          <p className="text-[#617589] dark:text-gray-400 text-base font-normal leading-normal">
            {t("profile.capNhatThongTin")}
          </p>
        </div>
        {!isEditing && (
          <Button 
            type="primary"
            icon={<PencilIcon className="h-4 w-4" />}
            onClick={() => setIsEditing(true)}
            className="h-10"
          >
            {t("profile.chinhSua")}
          </Button>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 p-3 bg-green-100 text-green-700 rounded-lg flex items-center gap-2">
          <svg
            className="h-5 w-5 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          {success}
        </div>
      )}

      <div className={`py-6 flex flex-col gap-6 ${!isEditing ? "disabled-form" : ""}`}>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative group">
            <div className="h-24 w-24 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 border-2 border-gray-100 dark:border-gray-600">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-primary text-white text-3xl font-bold uppercase">
                  {formData.fullName ? formData.fullName.charAt(0) : "U"}
                </div>
              )}
            </div>
            {isEditing && (
              <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <CameraIcon className="h-8 w-8 text-white" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </label>
            )}
          </div>

          <div className="flex-grow w-full">
            <label className="flex flex-col min-w-40">
              <p className="text-[#111418] dark:text-white text-sm font-medium leading-normal pb-2">
                {t("profile.hoVaTen")}
              </p>
              <Input
                name="fullName"
                value={formData.fullName}
                onChange={(e) => handleAntdChange("fullName", e.target.value)}
                disabled={!isEditing}
                placeholder={t("profile.nhapHoVaTen")}
                size="large"
              />
            </label>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <label className="flex flex-col min-w-40">
            <p className="text-[#111418] dark:text-white text-sm font-medium leading-normal pb-2">
              {t("profile.email")}
            </p>
            <Input
              name="gmail"
              value={formData.gmail}
              onChange={(e) => handleAntdChange("gmail", e.target.value)}
              disabled={!isEditing}
              placeholder={t("profile.nhapEmail")}
              type="email"
              size="large"
            />
          </label>
          <label className="flex flex-col min-w-40">
            <p className="text-[#111418] dark:text-white text-sm font-medium leading-normal pb-2">
              {t("profile.soDienThoai")}
            </p>
            <Input
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={(e) => handleAntdChange("phoneNumber", e.target.value)}
              disabled={!isEditing}
              placeholder={t("profile.nhapSoDienThoai")}
              type="tel"
              size="large"
            />
          </label>
          <label className="flex flex-col min-w-40">
            <p className="text-[#111418] dark:text-white text-sm font-medium leading-normal pb-2">
              {t("profile.ngaySinh")}
            </p>
            <DatePicker
              value={formData.birthday ? dayjs(formData.birthday) : null}
              onChange={(date) => handleAntdChange("birthday", date ? date.format("YYYY-MM-DD") : "")}
              disabled={!isEditing}
              format="DD/MM/YYYY"
              className="w-full"
              placeholder={t("profile.chonNgaySinh")}
              size="large"
            />
          </label>
          <label className="flex flex-col min-w-40">
            <p className="text-[#111418] dark:text-white text-sm font-medium leading-normal pb-2">
              {t("profile.diaChi")}
            </p>
            <Input
              name="address"
              value={formData.address}
              onChange={(e) => handleAntdChange("address", e.target.value)}
              disabled={!isEditing}
              placeholder={t("profile.nhapDiaChi")}
              size="large"
            />
          </label>
        </div>

        {/* Teacher-specific fields - Only show for teachers */}
        {user?.role === "TEACHER" && (
        <div className="mt-6 pt-6 border-t border-black/10 dark:border-white/10">
          <h3 className="text-lg font-semibold text-[#111418] dark:text-white mb-4">
            {t("profile.thongTinGiaoVien")}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <label className="flex flex-col min-w-40">
              <p className="text-[#111418] dark:text-white text-sm font-medium leading-normal pb-2">
                {t("profile.noiCongTac")}
              </p>
              <Input
                name="workPlace"
                value={formData.workPlace}
                onChange={(e) => handleAntdChange("workPlace", e.target.value)}
                disabled={!isEditing}
                placeholder={t("profile.viDuTruong")}
                size="large"
              />
            </label>
            <label className="flex flex-col min-w-40">
              <p className="text-[#111418] dark:text-white text-sm font-medium leading-normal pb-2">
                {t("profile.soNamKinhNghiem")}
              </p>
              <InputNumber
                name="yearsOfExperience"
                value={formData.yearsOfExperience ? parseInt(formData.yearsOfExperience) : undefined}
                onChange={(value) => handleAntdChange("yearsOfExperience", value || "")}
                disabled={!isEditing}
                min={0}
                placeholder={t("profile.viDuNam")}
                className="w-full"
                size="large"
              />
            </label>
            <label className="flex flex-col min-w-40">
              <p className="text-[#111418] dark:text-white text-sm font-medium leading-normal pb-2">
                {t("profile.linhVucChuyenMon")}
              </p>
              <Input
                name="fieldOfExpertise"
                value={formData.fieldOfExpertise}
                onChange={(e) => handleAntdChange("fieldOfExpertise", e.target.value)}
                disabled={!isEditing}
                placeholder={t("profile.viDuChuyenMon")}
                size="large"
              />
            </label>
          </div>
          <label className="flex flex-col min-w-40 mt-6">
            <p className="text-[#111418] dark:text-white text-sm font-medium leading-normal pb-2">
              {t("profile.gioiThieuVeBanThan")}
            </p>
            <Input.TextArea
              name="bio"
              value={formData.bio}
              onChange={(e) => handleAntdChange("bio", e.target.value)}
              disabled={!isEditing}
              rows={4}
              placeholder={t("profile.chiaSe")}
              size="large"
            />
          </label>
        </div>
        )}
      </div>
      {isEditing && (
        <div className="flex justify-end gap-4 pt-6 border-t border-black/10 dark:border-white/10">
          <Space>
            <Button 
              onClick={handleCancel}
              disabled={loading}
            >
              {t("profile.huy")}
            </Button>
            <Button 
              type="primary"
              onClick={handleSave}
              loading={loading}
            >
              {loading ? t("profile.dangLuu") : t("profile.luuThayDoi")}
            </Button>
          </Space>
        </div>
      )}
    </>
  );
}
