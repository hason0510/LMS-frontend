import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Select, message, Popconfirm } from "antd";
import TeacherHeader from "../../components/layout/TeacherHeader";
import AdminSidebar from "../../components/layout/AdminSidebar";
import AppBreadcrumb from "../../components/common/AppBreadcrumb";
import UserIdentity from "../../components/common/UserIdentity";
import AdminUserModal from "./AdminUserModal";
import DataPaginationFooter from "../../components/common/DataPaginationFooter";
import { getAllUsers, deleteUser, updateUser, createUser, lockUser, unlockUser } from "../../api/user";
import {
  MagnifyingGlassIcon,
  PlusCircleIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  LockClosedIcon,
  LockOpenIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";

export default function AdminUserManagement() {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith("vi") ? "vi-VN" : "en-US";
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setSidebarCollapsed(window.innerWidth < 1024);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const [modalMode, setModalMode] = useState("view"); // "view" or "edit"
  const [selectedUser, setSelectedUser] = useState(null);
  const hasInitialized = useRef(false);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Fetch users on component mount (only once)
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      fetchUsers();
    }
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      // Lấy tổng số user trước, sau đó fetch tất cả trong 1 request
      const probe = await getAllUsers(0, 1);
      const totalElements = probe?.data?.totalElements || 0;
      if (totalElements === 0) {
        setUsers([]);
        return;
      }
      const response = await getAllUsers(0, totalElements);
      const userList = response?.data?.pageList || [];
      setUsers(userList);
      message.success(t("adminUsers.messages.loadSuccess"));
    } catch (error) {
      console.error("Error fetching users:", error);
      message.error(t("adminUsers.messages.loadFailed"));
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserLock = async (user) => {
    try {
      if (user.status === "active") {
        await lockUser(user.id);
        message.success(t("adminUsers.messages.locked", { name: user.name }));
      } else {
        await unlockUser(user.id);
        message.success(t("adminUsers.messages.unlocked", { name: user.name }));
      }
      fetchUsers();
    } catch (error) {
      console.error("Error toggling user lock:", error);
      message.error(error?.response?.data?.message || t("adminUsers.messages.toggleFailed"));
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      await deleteUser(userId);
      message.success(t("adminUsers.messages.deleteSuccess"));
      fetchUsers(); // Reload list
    } catch (error) {
      console.error("Error deleting user:", error);
      message.error(t("adminUsers.messages.deleteFailed"));
    }
  };

  const handleOpenViewModal = (user) => {
    setSelectedUser(user);
    setModalMode("view");
    setModalOpen(true);
  };

  const handleOpenEditModal = (user) => {
    setSelectedUser(user);
    setModalMode("edit");
    setModalOpen(true);
  };

  const handleOpenCreateModal = () => {
    setSelectedUser(null);
    setModalMode("create");
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedUser(null);
  };

  const handleSaveUserChanges = async (userId, updatedData) => {
    try {
      if (modalMode === "create") {
        // For creating new user, call createUser API
        await createUser(updatedData);
        // message.success("Tạo người dùng thành công");
      } else {
        // For editing user, call updateUser API
        await updateUser(userId, {
          fullName: updatedData.fullName,
          gmail: updatedData.gmail,
          role: updatedData.role,
          studentNumber: updatedData.studentNumber,
          phoneNumber: updatedData.phoneNumber,
          address: updatedData.address,
        });
        // message.success("Cập nhật người dùng thành công");
      }
      fetchUsers();
      handleCloseModal();
    } catch (error) {
      console.error("Error saving user:", error);
      throw error;
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Mock user data
  const mockUsers = [];

  // Format user data from API
  const formattedUsers = users.map(user => {
    // Map roleName từ API (ADMIN, STUDENT, TEACHER) thành code
    let roleCode = "STUDENT";
    if (user.roleName) {
      roleCode = user.roleName; // Sử dụng roleName từ API nếu có
    } else if (user.role) {
      roleCode = user.role; // Hoặc fallback sang role
    }

    return {
      id: user.id,
      username: user.userName || user.username || "N/A",
      name: user.fullName || user.name || "N/A",
      email: user.gmail || user.email || "N/A",
      role: roleCode,
      status: user.active === false ? "inactive" : "active",
      createdDate: user.createdDate
        ? new Date(user.createdDate).toLocaleString(dateLocale, { dateStyle: 'short', timeStyle: 'short' })
        : "N/A",
      studentNumber: user.studentNumber || "",
      phoneNumber: user.phoneNumber || "",
      address: user.address || "",
      imageUrl: user.imageUrl || "",
    };
  });

  // Filter users
  let filteredUsers = formattedUsers.filter((user) => {
    const keyword = searchQuery.trim().toLowerCase();
    const matchesSearch =
      keyword === "" ||
      user.name.toLowerCase().includes(keyword) ||
      user.email.toLowerCase().includes(keyword) ||
      user.username.toLowerCase().includes(keyword) ||
      (user.studentNumber && user.studentNumber.toLowerCase().includes(keyword));

    const matchesRole =
      roleFilter === "all" || user.role === roleFilter.toUpperCase();

    const matchesStatus =
      statusFilter === "all" || user.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = filteredUsers.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case "STUDENT":
        return "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300";
      case "TEACHER":
        return "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300";
      case "ADMIN":
        return "bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-300";
      default:
        return "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300";
    }
  };

  const getStatusBadgeColor = (status) => {
    return status === "active"
      ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
      : "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300";
  };

  const getRoleLabel = (role) => t(`adminUsers.roles.${role}`, { defaultValue: role });

  const getStatusLabel = (status) =>
    t(`adminUsers.status.${status === "active" ? "active" : "inactive"}`);

  return (
    <div className="admin-user-management-page min-h-screen bg-background-light dark:bg-background-dark">
      <TeacherHeader toggleSidebar={toggleSidebar} />
      <AdminSidebar />

      <main className={`lg:ml-64 pt-20 pb-8 px-4 sm:px-6 lg:px-8 transition-all duration-300 ${
        sidebarCollapsed ? "pl-20" : "pl-64"
      }`}>
        <div className="mx-auto max-w-7xl">
          <AppBreadcrumb className="mb-6 mt-2" />
          <div className="app-table-shell mb-8 flex flex-col">
            {/* Page Header (bọc trong khung trắng, đồng bộ các bảng admin khác) */}
            <div className="flex flex-col gap-4 border-b border-gray-200 px-5 py-5 dark:border-gray-700 sm:flex-row sm:items-start sm:justify-between sm:px-6">
              <div>
                <h1 className="m-0 text-2xl font-bold text-gray-900 dark:text-white">
                  {t("adminUsers.title")}
                </h1>
                <p className="m-0 mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {t("adminUsers.subtitle")}
                </p>
              </div>
              <button
                onClick={handleOpenCreateModal}
                className="flex shrink-0 items-center justify-center gap-2 px-4 h-10 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors">
                <PlusCircleIcon className="h-4 w-4" />
                <span>{t("adminUsers.createButton")}</span>
              </button>
            </div>

            {/* Filters Section */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {/* Search Bar */}
                <div className="xl:col-span-2">
                  <label className="flex h-10 w-full flex-col">
                    <div className="flex h-full w-full flex-1 items-stretch rounded-lg">
                      <div className="flex items-center justify-center rounded-l-lg border-y border-l border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 pl-3 pr-3 text-gray-500 dark:text-gray-400">
                        <MagnifyingGlassIcon className="h-5 w-5" />
                      </div>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="form-input !h-auto w-full min-w-0 flex-1 resize-none overflow-hidden rounded-r-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 text-base font-normal leading-normal text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:border-primary focus:ring-primary"
                        placeholder={t("adminUsers.searchPlaceholder")}
                      />
                    </div>
                  </label>
                </div>

                {/* Filter Dropdowns */}
                <div className="flex gap-3">
                  <Select
                    value={roleFilter}
                    onChange={(value) => {
                      setRoleFilter(value);
                      setCurrentPage(1);
                    }}
                    className="flex-1"
                    style={{ height: "40px" }}
                    showSearch
                    optionFilterProp="label"
                    options={[
                      { label: t("adminUsers.filters.roleAll"), value: "all" },
                      { label: t("adminUsers.roles.STUDENT"), value: "student" },
                      { label: t("adminUsers.roles.TEACHER"), value: "teacher" },
                      { label: t("adminUsers.roles.ADMIN"), value: "admin" },
                    ]}
                  />

                  <Select
                    value={statusFilter}
                    onChange={(value) => {
                      setStatusFilter(value);
                      setCurrentPage(1);
                    }}
                    className="flex-1"
                    style={{ height: "40px" }}
                    showSearch
                    optionFilterProp="label"
                    options={[
                      { label: t("adminUsers.filters.statusAll"), value: "all" },
                      { label: t("adminUsers.status.active"), value: "active" },
                      { label: t("adminUsers.status.inactive"), value: "inactive" },
                    ]}
                  />
                </div>
              </div>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto">
              <table className="app-native-table">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="py-3.5 pl-4 pr-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 w-12" scope="col">
                      {t("adminUsers.table.index")}
                    </th>
                    <th className="px-3 py-3.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-300" scope="col">
                      {t("adminUsers.table.username")}
                    </th>
                    <th className="px-3 py-3.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-300" scope="col">
                      {t("adminUsers.table.nameEmail")}
                    </th>
                    <th className="px-3 py-3.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-300" scope="col">
                      {t("adminUsers.table.role")}
                    </th>
                    <th className="px-3 py-3.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-300" scope="col">
                      {t("adminUsers.table.status")}
                    </th>
                    <th className="px-3 py-3.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-300" scope="col">
                      {t("adminUsers.table.createdDate")}
                    </th>
                    <th className="px-3 py-3.5 !text-center text-xs font-semibold text-gray-600 dark:text-gray-300" scope="col">
                      {t("adminUsers.table.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-gray-500 dark:text-gray-400">
                        <div className="flex justify-center items-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedUsers.length > 0 ? (
                    paginatedUsers.map((user, index) => (
                      <tr 
                        key={user.id} 
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <td className="whitespace-nowrap text-center py-4 pl-4 pr-3 text-gray-600 dark:text-gray-400 text-xs font-medium w-12">
                          {startIndex + index + 1}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {user.username}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4">
                          <UserIdentity
                            user={user}
                            secondaryText={
                              user.role === "STUDENT"
                                ? user.studentNumber || user.email
                                : user.email
                            }
                            avatarSizeClass="size-9"
                          />
                        </td>
                        <td className="whitespace-nowrap px-3 py-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getRoleBadgeColor(
                              user.role
                            )}`}
                          >
                            {getRoleLabel(user.role)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getStatusBadgeColor(
                              user.status
                            )}`}
                          >
                            {getStatusLabel(user.status)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-gray-500 dark:text-gray-400">
                          {user.createdDate}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4">
                          <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              className="p-1 text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-primary transition-colors"
                              title={t("adminUsers.actions.view")}
                              onClick={() => handleOpenViewModal(user)}
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>
                            <button
                              className="p-1 text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-primary transition-colors"
                              title={t("adminUsers.actions.edit")}
                              onClick={() => handleOpenEditModal(user)}
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <Popconfirm
                              title={user.status === "active" ? t("adminUsers.confirm.lockTitle") : t("adminUsers.confirm.unlockTitle")}
                              description={user.status === "active"
                                ? t("adminUsers.confirm.lockDesc", { name: user.name })
                                : t("adminUsers.confirm.unlockDesc", { name: user.name })}
                              onConfirm={() => handleToggleUserLock(user)}
                              okText={user.status === "active" ? t("adminUsers.confirm.lockOk") : t("adminUsers.confirm.unlockOk")}
                              cancelText={t("adminUsers.confirm.cancel")}
                            >
                              <button
                                className={`p-1 transition-colors ${
                                  user.status === "active"
                                    ? "text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
                                    : "text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                                }`}
                                title={user.status === "active" ? t("adminUsers.actions.lock") : t("adminUsers.actions.unlock")}
                              >
                                {user.status === "active" ? (
                                  <LockClosedIcon className="h-4 w-4" />
                                ) : (
                                  <LockOpenIcon className="h-4 w-4" />
                                )}
                              </button>
                            </Popconfirm>
                            <Popconfirm
                              title={t("adminUsers.confirm.deleteTitle")}
                              description={t("adminUsers.confirm.deleteDesc", { name: user.name })}
                              onConfirm={() => handleDeleteUser(user.id)}
                              okText={t("adminUsers.confirm.deleteOk")}
                              cancelText={t("adminUsers.confirm.cancel")}
                              okButtonProps={{ danger: true }}
                            >
                              <button className="p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors" title={t("adminUsers.actions.delete")}>
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </Popconfirm>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-gray-500 dark:text-gray-400">
                        {t("adminUsers.empty")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <DataPaginationFooter
              currentPage={currentPage}
              pageSize={itemsPerPage}
              total={filteredUsers.length}
              pageSizeOptions={[20, 50, 100, 200]}
              totalLabel={t("adminUsers.pagination.total")}
              pageSizeLabel={t("adminUsers.pagination.pageSize")}
              onPageChange={(page) => setCurrentPage(page)}
              onPageSizeChange={(size) => {
                setItemsPerPage(size);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
      </main>

      {/* User Modal */}
      <AdminUserModal
        open={modalOpen}
        mode={modalMode}
        user={selectedUser}
        onClose={handleCloseModal}
        onSave={handleSaveUserChanges}
      />
    </div>
  );
}
