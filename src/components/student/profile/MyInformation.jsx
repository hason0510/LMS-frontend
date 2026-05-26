import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { CameraIcon, PencilIcon } from "@heroicons/react/24/solid";
import { Input, InputNumber, Button, Space, DatePicker, Segmented } from "antd";
import dayjs from "dayjs";
import { getUserById, updateUser, uploadUserAvatar } from "../../../api/user";
import Avatar from "../../common/Avatar";
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
    userName: "",
    gmail: "",
    studentNumber: "",
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
  const [avatarMode, setAvatarMode] = useState("upload");
  const [avatarUrl, setAvatarUrl] = useState("");

  const normalizeUserProfile = (data) => {
    if (!data) return data;
    return {
      ...data,
      username: data.userName || data.username || "",
      role: data.role || data.roleName || user?.role,
    };
  };

  // Initialize form data from userData prop
  useEffect(() => {
    if (userData) {
      const normalizedUserData = normalizeUserProfile(userData);
      setInitialData(normalizedUserData);
      setFormData({
        fullName: normalizedUserData.fullName || "",
        userName: normalizedUserData.userName || normalizedUserData.username || "",
        gmail: normalizedUserData.gmail || "",
        studentNumber: normalizedUserData.studentNumber || "",
        phoneNumber: normalizedUserData.phoneNumber || "",
        birthday: normalizedUserData.birthday || "",
        address: normalizedUserData.address || "",
        workPlace: normalizedUserData.workPlace || "",
        yearsOfExperience: normalizedUserData.yearsOfExperience || "",
        fieldOfExpertise: normalizedUserData.fieldOfExpertise || "",
        bio: normalizedUserData.bio || "",
      });
      // Map image_uri from backend to avatar for display
      setAvatarPreview(normalizedUserData.imageUrl);
      setAvatarUrl(normalizedUserData.imageUrl || "");
      setLoading(false);
    }
  }, [userData]);

  // Update loading state from parent
  useEffect(() => {
    setLoading(parentLoading);
  }, [parentLoading]);

  const handleAntdChange = (fieldName, value) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarMode("upload");
      setAvatarFile(file);
      setAvatarUrl("");
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleAvatarUrlChange = (e) => {
    const nextValue = e.target.value;
    setAvatarMode("link");
    setAvatarUrl(nextValue);
    setAvatarFile(null);
    const trimmedValue = nextValue.trim();
    setAvatarPreview(trimmedValue ? trimmedValue : (initialData?.imageUrl || null));
  };

  const isValidAvatarUrl = (value) => {
    if (!value) return false;
    try {
      const parsed = new URL(value);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
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

      const nextAvatarUrl = avatarMode === "link" ? avatarUrl.trim() : "";
      if (avatarMode === "link") {
        if (!nextAvatarUrl) {
          throw new Error("Avatar URL is required");
        }
        if (!isValidAvatarUrl(nextAvatarUrl)) {
          throw new Error("Avatar URL không hợp lệ");
        }
      }

      const nextUserName = (formData.userName || "").trim();
      if (!nextUserName) {
        throw new Error("Tên đăng nhập không được để trống");
      }

      await updateUser(user.id, {
        ...formData,
        userName: nextUserName,
        imageUrl: nextAvatarUrl || undefined,
      });

      if (avatarFile) {
        await uploadUserAvatar(user.id, avatarFile);
      }

      const refreshedUserResponse = await getUserById(user.id);
      const fullUserData = normalizeUserProfile(
        refreshedUserResponse?.data || refreshedUserResponse
      );

      if (avatarMode === "link" && nextAvatarUrl && fullUserData?.imageUrl !== nextAvatarUrl) {
        throw new Error("Backend chua luu duoc link avatar. Hay kiem tra backend da chay code moi va thu lai.");
      }

      setInitialData(fullUserData);
      setAvatarPreview(fullUserData.imageUrl || null);
      setAvatarUrl(fullUserData.imageUrl || "");
      if (onUpdate) {
        onUpdate(fullUserData);
      }

      // Update Zustand store with new user data
      updateUserStoreData(fullUserData);

      setSuccess(t("profile.capNhatThanhCong"));
      setIsEditing(false);
      setAvatarFile(null);
      // Auto-hide success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || t("profile.capNhatThatBai"));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (initialData) {
      setFormData({
        fullName: initialData.fullName || "",
        userName: initialData.userName || initialData.username || "",
        gmail: initialData.gmail || "",
        studentNumber: initialData.studentNumber || "",
        phoneNumber: initialData.phoneNumber || "",
        birthday: initialData.birthday || "",
        address: initialData.address || "",
        workPlace: initialData.workPlace || "",
        yearsOfExperience: initialData.yearsOfExperience || "",
        fieldOfExpertise: initialData.fieldOfExpertise || "",
        bio: initialData.bio || "",
      });
      setAvatarPreview(initialData.imageUrl || initialData.avatar || initialData.image_url || null);
      setAvatarUrl(initialData.imageUrl || initialData.avatar || initialData.image_url || "");
      setAvatarFile(null);
      setAvatarMode("upload");
    }
    setIsEditing(false);
    setError("");
    setSuccess("");
  };

  if (loading) {
    return (
      <div className="space-y-6 py-2">
        <div className="h-20 animate-pulse rounded-lg bg-slate-100 dark:bg-white/5" />
        <div className="grid gap-5 md:grid-cols-2">
          <div className="h-24 animate-pulse rounded-lg bg-slate-100 dark:bg-white/5" />
          <div className="h-24 animate-pulse rounded-lg bg-slate-100 dark:bg-white/5" />
          <div className="h-24 animate-pulse rounded-lg bg-slate-100 dark:bg-white/5" />
          <div className="h-24 animate-pulse rounded-lg bg-slate-100 dark:bg-white/5" />
        </div>
      </div>
    );
  }

  const isStudent = user?.role === "STUDENT";
  const persistedAvatar =
    initialData?.imageUrl || initialData?.avatar || initialData?.image_url || null;
  const displayName =
    formData.fullName || initialData?.fullName || user?.fullName || user?.username || "User";
  const sectionTitleClass =
    "mb-2 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400";
  const fieldLabelClass =
    "mb-1 text-sm font-medium text-[#111418] dark:text-white";
  const inputClass = "h-11 rounded-lg";
  const textAreaClass = "rounded-lg";

  return (
    <div className="my-information">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5 dark:border-white/10">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="!mb-1 text-2xl font-bold tracking-tight text-[#111418] dark:text-white sm:text-[2rem]">
            {t("profile.thongTinCaNhan")}
          </p>
          <p className="!mb-1 text-base font-normal leading-normal text-[#617589] dark:text-gray-400">
            {t("profile.capNhatThongTin")}
          </p>
        </div>
{/*        {!isEditing && (
          <Button
            type="primary"
            icon={<PencilIcon className="h-4 w-4" />}
            onClick={() => setIsEditing(true)}
            className="h-5 rounded-lg px-5 shadow-sm"
          >
            {t("profile.chinhSua")}
          </Button>
        )}*/}
        {!isEditing && (
            <Button
                type="primary"
                onClick={() => setIsEditing(true)}
                // 1. Thay h-5 thành h-10, thêm flex items-center justify-center gap-2
                className="flex items-center justify-center gap-2 h-10 rounded-lg px-5 shadow-sm"
            >
              {/* 2. Đưa icon xuống làm con trực tiếp */}
              <PencilIcon className="h-3 w-3" />

              {/* 3. Bọc chữ bằng thẻ span kèm leading-none để triệt tiêu line-height thừa */}
              <span className="leading-none">{t("profile.chinhSua")}</span>
            </Button>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-lg bg-red-100 p-3 text-red-700 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-green-100 p-3 text-green-700 dark:bg-green-950/30 dark:text-green-200">
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

      <div className={`py-6 ${!isEditing ? "disabled-form" : ""}`}>
        <section className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.04] sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="relative group shrink-0">
                <Avatar
                  src={avatarPreview || persistedAvatar}
                  alt={displayName}
                  sizeClass="size-20"
                  initialsClass="text-3xl"
                  className="border-4 border-white shadow-sm dark:border-slate-800"
                />
                {isEditing && (
                  <label className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
                    <CameraIcon className="h-7 w-7 text-white" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                  </label>
                )}
              </div>
              <div className="min-w-0">
                <p className="!mb-0 text-sm font-semibold text-slate-900 dark:text-white">
                  {t("profile.anhDaiDien")}
                </p>
                <p className="!mb-0 mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  {t("profile.capNhatAnhDaiDien")}
                </p>
              </div>
            </div>

            {isEditing && (
              <div className="w-full space-y-5 sm:max-w-md">
                <Segmented
                  value={avatarMode}
                  onChange={setAvatarMode}
                  options={[
                    { label: t("profile.taiAnhLen"), value: "upload" },
                    { label: t("profile.danLinkAnh"), value: "link" },
                  ]}
                  className="w-full sm:w-auto"
                />
                {avatarMode === "link" && (
                  <Input
                    value={avatarUrl}
                    onChange={handleAvatarUrlChange}
                    placeholder={t("profile.danLinkAnhDaiDien")}
                    size="large"
                    allowClear
                    className="mt-4 rounded-lg"
                  />
                )}
              </div>
            )}
          </div>
        </section>

        <div className="mt-6">
          <div className={sectionTitleClass}>
            <span>{t("profile.thongTinCoBan")}</span>
            <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <label className="flex min-w-0 flex-col">
              <p className={fieldLabelClass}>{t("profile.hoVaTen")}</p>
              <Input
                name="fullName"
                value={formData.fullName}
                onChange={(e) => handleAntdChange("fullName", e.target.value)}
                disabled={!isEditing}
                placeholder={t("profile.nhapHoVaTen")}
                size="large"
                className={inputClass}
              />
            </label>

            <label className="flex min-w-0 flex-col">
              <p className={fieldLabelClass}>{t("profile.email")}</p>
              <Input
                name="gmail"
                value={formData.gmail}
                onChange={(e) => handleAntdChange("gmail", e.target.value)}
                disabled={!isEditing}
                placeholder={t("profile.nhapEmail")}
                type="email"
                size="large"
                className={inputClass}
              />
            </label>

            <label className="flex min-w-0 flex-col">
              <p className={fieldLabelClass}>{t("profile.soDienThoai")}</p>
              <Input
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={(e) => handleAntdChange("phoneNumber", e.target.value)}
                disabled={!isEditing}
                placeholder={t("profile.nhapSoDienThoai")}
                type="tel"
                size="large"
                className={inputClass}
              />
            </label>

            <label className="flex min-w-0 flex-col">
              <p className={fieldLabelClass}>{t("profile.ngaySinh")}</p>
              <DatePicker
                value={formData.birthday ? dayjs(formData.birthday) : null}
                onChange={(date) => handleAntdChange("birthday", date ? date.format("YYYY-MM-DD") : "")}
                disabled={!isEditing}
                format="DD/MM/YYYY"
                className="h-11 w-full rounded-lg"
                placeholder={t("profile.chonNgaySinh")}
                size="large"
              />
            </label>
          </div>
        </div>

        {isStudent && (
        <div className="mt-6">
          <div className={sectionTitleClass}>
            <span>{t("profile.thongTinHocTap")}</span>
            <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
          </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <label className="flex min-w-0 flex-col">
                <p className={fieldLabelClass}>MSSV</p>
                <Input
                  name="studentNumber"
                  value={formData.studentNumber}
                  onChange={(e) => handleAntdChange("studentNumber", e.target.value)}
                  disabled
                  placeholder={t("profile.nhapMaSinhVien")}
                  size="large"
                  className={inputClass}
                />
              </label>

              <label className="flex min-w-0 flex-col">
                <p className={fieldLabelClass}>{t("profile.tenDangNhap")}</p>
                <Input
                  name="userName"
                  value={formData.userName}
                  onChange={(e) => handleAntdChange("userName", e.target.value)}
                  disabled={!isEditing}
                  placeholder={t("profile.tenDangNhap")}
                  size="large"
                  className={inputClass}
                />
              </label>
            </div>
          </div>
        )}

        <div className="mt-6">
          <div className={sectionTitleClass}>
            <span>{t("profile.thongTinLienHe")}</span>
            <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
          </div>
          <div className="grid grid-cols-1 gap-5">
            <label className="flex min-w-0 flex-col">
              <p className={fieldLabelClass}>{t("profile.diaChi")}</p>
              <Input
                name="address"
                value={formData.address}
                onChange={(e) => handleAntdChange("address", e.target.value)}
                disabled={!isEditing}
                placeholder={t("profile.nhapDiaChi")}
                size="large"
                className={inputClass}
              />
            </label>
          </div>
        </div>

        {user?.role === "TEACHER" && (
        <div className="mt-6">
          <div className={sectionTitleClass}>
            <span>{t("profile.thongTinGiaoVien")}</span>
            <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <label className="flex min-w-0 flex-col">
              <p className={fieldLabelClass}>{t("profile.noiCongTac")}</p>
              <Input
                name="workPlace"
                value={formData.workPlace}
                onChange={(e) => handleAntdChange("workPlace", e.target.value)}
                disabled={!isEditing}
                placeholder={t("profile.viDuTruong")}
                size="large"
                className={inputClass}
              />
            </label>

            <label className="flex min-w-0 flex-col">
              <p className={fieldLabelClass}>{t("profile.soNamKinhNghiem")}</p>
              <InputNumber
                name="yearsOfExperience"
                value={formData.yearsOfExperience ? parseInt(formData.yearsOfExperience, 10) : undefined}
                onChange={(value) => handleAntdChange("yearsOfExperience", value || "")}
                disabled={!isEditing}
                min={0}
                placeholder={t("profile.viDuNam")}
                className="h-11 w-full rounded-lg"
                size="large"
              />
            </label>

            <label className="flex min-w-0 flex-col md:col-span-2">
              <p className={fieldLabelClass}>{t("profile.linhVucChuyenMon")}</p>
              <Input
                name="fieldOfExpertise"
                value={formData.fieldOfExpertise}
                onChange={(e) => handleAntdChange("fieldOfExpertise", e.target.value)}
                disabled={!isEditing}
                placeholder={t("profile.viDuChuyenMon")}
                size="large"
                className={inputClass}
              />
            </label>
          </div>

          <label className="mt-5 flex min-w-0 flex-col">
            <p className={fieldLabelClass}>{t("profile.gioiThieuVeBanThan")}</p>
            <Input.TextArea
              name="bio"
              value={formData.bio}
              onChange={(e) => handleAntdChange("bio", e.target.value)}
              disabled={!isEditing}
              rows={4}
              placeholder={t("profile.chiaSe")}
              size="large"
              className={textAreaClass}
            />
          </label>
        </div>
        )}
      </div>
      {isEditing && (
        <div className="flex justify-end gap-4 border-t border-slate-200 pt-6 dark:border-white/10">
          <Space>
            <Button
              onClick={handleCancel}
              disabled={loading}
              className="h-10 rounded-lg px-5"
            >
              {t("profile.huy")}
            </Button>
            <Button
              type="primary"
              onClick={handleSave}
              loading={loading}
              className="h-10 rounded-lg px-5"
            >
              {loading ? t("profile.dangLuu") : t("profile.luuThayDoi")}
            </Button>
          </Space>
        </div>
      )}
    </div>
  );
}
