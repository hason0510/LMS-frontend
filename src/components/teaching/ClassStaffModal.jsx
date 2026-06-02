import React, { useEffect, useMemo, useState } from "react";
import { Alert, App, Button, Checkbox, Modal, Select, Tag, Tooltip, Avatar, Spin } from "antd";
import { useTranslation } from "react-i18next";
import { addMember, getMembers, removeMember, updateMemberPermissions, updateMemberRole } from "../../api/classSection";
import { searchUsers } from "../../api/user";
import { UserPlusIcon, TrashIcon, ShieldCheckIcon, ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";

const TA_PERMISSION_KEYS = [
  "VIEW_CLASS",
  "VIEW_PEOPLE",
  "VIEW_PROGRESS",
  "MANAGE_ASSIGNMENTS",
  "REVIEW_QUIZZES",
  "POST_ANNOUNCEMENTS",
  "REPLY_COMMENTS",
];

export default function ClassStaffModal({ open, classSectionId, canManageStaff = false, onClose, onChanged }) {
  const { message } = App.useApp();
  const { t } = useTranslation();
  const [members, setMembers] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState();
  const [selectedRole, setSelectedRole] = useState("TA");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Expandable row state for permissions
  const [expandedMemberId, setExpandedMemberId] = useState(null);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [permissionSaving, setPermissionSaving] = useState(false);

  const loadMembers = async () => {
    if (!classSectionId) return;
    try {
      setLoading(true);
      const response = await getMembers(classSectionId);
      setMembers(Array.isArray(response) ? response : response?.data || []);
    } catch (err) {
      message.error(err?.response?.data?.message || t("teaching.staff.errors.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadMembers();
      setExpandedMemberId(null);
    }
  }, [open, classSectionId]);

  const searchAvailableUsers = async (value) => {
    try {
      const response = await searchUsers({ keyword: value, pageNumber: 1, pageSize: 20 });
      const pageList = response?.pageList || response?.data?.pageList || (Array.isArray(response) ? response : []);
      setUsers(pageList);
    } catch {
      setUsers([]);
    }
  };

  const memberIds = useMemo(() => new Set(members.map((item) => item.userId)), [members]);
  const userOptions = users
    .filter((user) => !memberIds.has(user.id))
    .map((user) => ({
      value: user.id,
      label: (
        <div className="flex flex-col">
          <span className="font-medium text-gray-800 dark:text-white">
            {user.fullName || user.userName || user.username || t("teaching.layout.defaultUser")}
          </span>
          {user.gmail && <span className="text-xs text-gray-500">{user.gmail}</span>}
        </div>
      ),
    }));

  const handleAdd = async () => {
    if (!selectedUserId) {
      message.warning(t("teaching.staff.errors.selectUser"));
      return;
    }
    try {
      setSaving(true);
      await addMember(classSectionId, { userId: selectedUserId, role: selectedRole });
      message.success(t("teaching.staff.messages.added"));
      setSelectedUserId(undefined);
      await loadMembers();
      onChanged?.();
    } catch (err) {
      message.error(err?.response?.data?.message || t("teaching.staff.errors.addFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRole = async (record, role) => {
    try {
      await updateMemberRole(classSectionId, record.userId, { role });
      message.success(t("teaching.staff.messages.roleUpdated"));
      await loadMembers();
      onChanged?.();
    } catch (err) {
      message.error(err?.response?.data?.message || t("teaching.staff.errors.updateRoleFailed"));
    }
  };

  const handleRemove = async (record) => {
    try {
      await removeMember(classSectionId, record.userId);
      message.success(t("teaching.staff.messages.removed"));
      if (expandedMemberId === record.userId) setExpandedMemberId(null);
      await loadMembers();
      onChanged?.();
    } catch (err) {
      message.error(err?.response?.data?.message || t("teaching.staff.errors.removeFailed"));
    }
  };

  const togglePermissionEditor = (record) => {
    if (expandedMemberId === record.userId) {
      setExpandedMemberId(null);
    } else {
      setExpandedMemberId(record.userId);
      setSelectedPermissions(record.permissions?.length ? record.permissions : TA_PERMISSION_KEYS);
    }
  };

  const handleSavePermissions = async (userId) => {
    try {
      setPermissionSaving(true);
      const normalizedPermissions = Array.from(new Set(["VIEW_CLASS", ...selectedPermissions]));
      await updateMemberPermissions(classSectionId, userId, { permissions: normalizedPermissions });
      message.success(t("teaching.staff.messages.permissionsUpdated"));
      await loadMembers();
      onChanged?.();
      setExpandedMemberId(null);
    } catch (err) {
      message.error(err?.response?.data?.message || t("teaching.staff.errors.updatePermissionsFailed"));
    } finally {
      setPermissionSaving(false);
    }
  };

  const roleOptions = [
    { value: "TA", label: t("teaching.roles.teachingAssistant") },
    { value: "TEACHER", label: t("teaching.roles.primaryTeacher") },
  ];

  const permissionOptions = TA_PERMISSION_KEYS.map((permission) => ({
    value: permission,
    label: t(`teaching.staff.permissions.${permission}`),
    disabled: permission === "VIEW_CLASS",
  }));

  const getInitials = (name) => {
    if (!name) return "U";
    return name.charAt(0).toUpperCase();
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2 text-xl font-bold text-gray-800 dark:text-gray-100 pb-2 border-b border-gray-100 dark:border-gray-700">
          <ShieldCheckIcon className="w-6 h-6 text-primary" />
          {t("teaching.staff.title")}
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={760}
      destroyOnHidden
      centered
      className="modern-modal"
    >
      <div className="space-y-6 pt-4">
        {/* Info Alerts */}
        <div className="space-y-3">
{/*          <Alert
            type="info"
            showIcon
            message={<span className="font-semibold">{t("teaching.staff.roleRuleTitle")}</span>}
            description={<span className="text-sm text-gray-600 dark:text-gray-300">{t("teaching.staff.roleRuleDescription")}</span>}
            className="rounded-xl border-blue-100 bg-blue-50/50 dark:bg-blue-900/10 dark:border-blue-900/30"
          />*/}
          {!canManageStaff && (
            <Alert
              type="warning"
              showIcon
              message={<span className="font-semibold">{t("teaching.staff.readOnlyTitle")}</span>}
              description={<span className="text-sm text-gray-600 dark:text-gray-300">{t("teaching.staff.readOnlyDescription")}</span>}
              className="rounded-xl"
            />
          )}
        </div>

        {/* Add Bar */}
        {canManageStaff && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm flex flex-col sm:flex-row gap-3">
            <Select
              showSearch
              filterOption={false}
              value={selectedUserId}
              onSearch={searchAvailableUsers}
              onFocus={() => searchAvailableUsers("")}
              onChange={setSelectedUserId}
              options={userOptions}
              placeholder={t("teaching.staff.searchPlaceholder")}
              className="flex-1 min-w-[200px]"
              size="large"
            />
            <Select
              value={selectedRole}
              onChange={setSelectedRole}
              options={roleOptions}
              className="w-full sm:w-40 shrink-0"
              size="large"
              showSearch
              optionFilterProp="label"
            />
            <Button 
              type="primary" 
              loading={saving} 
              onClick={handleAdd} 
              size="large"
              icon={<UserPlusIcon className="w-5 h-5" />}
              className="shrink-0 flex items-center justify-center font-medium bg-primary hover:bg-primary/90"
            >
              {t("teaching.staff.actions.add")}
            </Button>
          </div>
        )}

        {/* Members List */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Danh sách nhân sự ({members.length})</h3>
          </div>
          
          <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[50vh] overflow-y-auto">
            {loading ? (
              <div className="p-8 flex justify-center">
                <Spin />
              </div>
            ) : members.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Chưa có nhân sự nào trong lớp học này.
              </div>
            ) : (
              members.map((member) => {
                const isTeacher = member.role === "TEACHER";
                const isExpanded = expandedMemberId === member.userId;
                const permissionsCount = (member.permissions || []).length;
                
                return (
                  <div key={member.userId} className={`transition-colors ${isExpanded ? "bg-indigo-50/30 dark:bg-indigo-900/10" : "hover:bg-gray-50 dark:hover:bg-gray-700/30"}`}>
                    <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                      {/* Avatar & Info */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar size="large" className="bg-primary/20 text-primary font-bold shrink-0">
                          {getInitials(member.fullName || member.username)}
                        </Avatar>
                        <div className="min-w-0">
                          <p className="m-0 text-sm font-bold text-gray-900 dark:text-white truncate">
                            {member.fullName || member.username}
                          </p>
                          <p className="m-0 text-xs text-gray-500 truncate">@{member.username}</p>
                        </div>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-3 sm:justify-end shrink-0 flex-wrap">
                        <Select
                          value={member.role}
                          disabled={!canManageStaff || isTeacher}
                          options={roleOptions}
                          onChange={(role) => handleUpdateRole(member, role)}
                          size="middle"
                          className="w-36"
                          bordered={false}
                          style={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
                          showSearch
                          optionFilterProp="label"
                        />
                        
                        {isTeacher ? (
                          <Tag color="blue" className="m-0 py-1 px-2.5 rounded-full border-none bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                            Giáo viên chính
                          </Tag>
                        ) : (
                          <Tooltip title={t("teaching.staff.actions.permissions")}>
                            <button
                              onClick={() => togglePermissionEditor(member)}
                              disabled={!canManageStaff}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors disabled:opacity-50
                                ${isExpanded 
                                  ? 'bg-primary text-white' 
                                  : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50'
                                }`}
                            >
                              <ShieldCheckIcon className="w-3.5 h-3.5" />
                              {permissionsCount}/{TA_PERMISSION_KEYS.length} Quyền
                              {isExpanded ? <ChevronUpIcon className="w-3.5 h-3.5 ml-1" /> : <ChevronDownIcon className="w-3.5 h-3.5 ml-1" />}
                            </button>
                          </Tooltip>
                        )}

                        <Tooltip title={t("teaching.staff.actions.remove")}>
                          <button
                            onClick={() => handleRemove(member)}
                            disabled={!canManageStaff || isTeacher}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-30 disabled:hover:text-gray-400 disabled:hover:bg-transparent"
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        </Tooltip>
                      </div>
                    </div>

                    {/* Expandable Permissions Editor */}
                    {isExpanded && !isTeacher && (
                      <div className="px-4 pb-4 pt-1 sm:pl-[68px] animate-fade-in-down">
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-indigo-100 dark:border-indigo-900/30 p-4 shadow-inner">
                          <div className="flex justify-between items-center mb-3 border-b border-gray-100 dark:border-gray-700 pb-2">
                            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                              Phân quyền cho trợ giảng
                            </h4>
                            <span className="text-xs text-gray-500">Các quyền này quyết định trợ giảng nhìn thấy tab nào và xử lý nghiệp vụ nào.</span>
                          </div>
                          
                          <Checkbox.Group
                            value={Array.from(new Set(["VIEW_CLASS", ...selectedPermissions]))}
                            onChange={setSelectedPermissions}
                            className="w-full"
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6">
                              {permissionOptions.map((option) => (
                                <Checkbox 
                                  key={option.value} 
                                  value={option.value} 
                                  disabled={option.disabled}
                                  className="text-sm text-gray-700 dark:text-gray-300 hover:text-primary transition-colors m-0"
                                >
                                  {option.label}
                                </Checkbox>
                              ))}
                            </div>
                          </Checkbox.Group>
                          
                          <div className="flex justify-end gap-2 mt-5 pt-3 border-t border-gray-100 dark:border-gray-700">
                            <Button size="small" onClick={() => setExpandedMemberId(null)}>Hủy</Button>
                            <Button 
                              size="small" 
                              type="primary" 
                              loading={permissionSaving} 
                              onClick={() => handleSavePermissions(member.userId)}
                            >
                              Lưu quyền
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
