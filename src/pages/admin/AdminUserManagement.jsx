import React, { useState, useEffect, useRef } from "react";
import { Select, message, Popconfirm } from "antd";
import TeacherHeader from "../../components/layout/TeacherHeader";
import AdminSidebar from "../../components/layout/AdminSidebar";
import AdminUserModal from "./AdminUserModal";
import { getAllUsers, deleteUser, updateUser, createUser } from "../../api/user";
import {
  MagnifyingGlassIcon,
  PlusCircleIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";

export default function AdminUserManagement() {
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
  const itemsPerPage = 10;

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
      const response = await getAllUsers(0, 200);
      // Response có thể là array hoặc object với content array
      const userList = response.data.pageList;
      setUsers(userList);
      message.success("Tải danh sách người dùng thành công");
    } catch (error) {
      console.error("Error fetching users:", error);
      message.error("Lỗi: Không thể tải danh sách người dùng");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      await deleteUser(userId);
      message.success("Xóa người dùng thành công");
      fetchUsers(); // Reload list
    } catch (error) {
      console.error("Error deleting user:", error);
      message.error("Lỗi: Không thể xóa người dùng");
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
      status: user.status === 0 ? "inactive" : "active",
      createdDate: user.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : "N/A"
    };
  });

  // Filter users
  let filteredUsers = formattedUsers.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());

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

  const getRoleLabel = (role) => {
    const roleMap = {
      STUDENT: "Sinh viên",
      TEACHER: "Giáo viên",
      ADMIN: "Quản trị viên",
    };
    return roleMap[role] || role;
  };

  const getStatusLabel = (status) => {
    return status === "active" ? "Hoạt động" : "Bị khóa";
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      <TeacherHeader toggleSidebar={toggleSidebar} />
      <AdminSidebar />

      <main className={`lg:ml-64 pt-16 pb-8 px-4 sm:px-6 lg:px-8 transition-all duration-300 ${
        sidebarCollapsed ? "pl-20" : "pl-64"
      }`}>
        <div className="mx-auto max-w-7xl">
          {/* Page Header */}
          <div className="flex flex-wrap mt-3 items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Quản lý Người dùng
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Quản lý tất cả người dùng trong hệ thống
              </p>
            </div>
            <button 
              onClick={handleOpenCreateModal}
              className="flex items-center justify-center gap-2 px-4 h-10 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors">
              <PlusCircleIcon className="h-5 w-5" />
              <span>Tạo người dùng mới</span>
            </button>
          </div>

          {/* Filters Section */}
          <div className="mb-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-4">
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
                      placeholder="Tìm kiếm theo tên, email..."
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
                  options={[
                    { label: "Vai trò: Tất cả", value: "all" },
                    { label: "Sinh viên", value: "student" },
                    { label: "Giáo viên", value: "teacher" },
                    { label: "Quản trị viên", value: "admin" },
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
                  options={[
                    { label: "Trạng thái: Tất cả", value: "all" },
                    { label: "Hoạt động", value: "active" },
                    { label: "Bị khóa", value: "inactive" },
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="py-3.5 pl-4 pr-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 w-12" scope="col">
                    STT
                  </th>
                  <th className="px-3 py-3.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-300" scope="col">
                    USERNAME
                  </th>
                  <th className="px-3 py-3.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-300" scope="col">
                    TÊN & EMAIL
                  </th>
                  <th className="px-3 py-3.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-300" scope="col">
                    VAI TRÒ
                  </th>
                  <th className="px-3 py-3.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-300" scope="col">
                    TRẠNG THÁI
                  </th>
                  <th className="px-3 py-3.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-300" scope="col">
                    NGÀY TẠO
                  </th>
                  <th className="relative py-3.5 pl-3 pr-4 text-xs font-semibold text-gray-600 dark:text-gray-300" scope="col">
                    HÀNH ĐỘNG
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
                        <div className="font-medium text-gray-900 dark:text-white">
                          {user.name}
                        </div>
                        <div className="text-gray-500 dark:text-gray-400 text-xs">
                          {user.email}
                        </div>
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
                      <td className="whitespace-nowrap py-4 pl-3 pr-4">
                        <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <button 
                            className="p-1 text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-primary transition-colors" 
                            title="Xem chi tiết"
                            onClick={() => handleOpenViewModal(user)}
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          <button 
                            className="p-1 text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-primary transition-colors" 
                            title="Chỉnh sửa"
                            onClick={() => handleOpenEditModal(user)}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <Popconfirm
                            title="Xóa người dùng"
                            description={`Bạn có chắc muốn xóa ${user.name}?`}
                            onConfirm={() => handleDeleteUser(user.id)}
                            okText="Xóa"
                            cancelText="Hủy"
                            okButtonProps={{ danger: true }}
                          >
                            <button className="p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors" title="Xóa">
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
                      Không tìm thấy người dùng nào
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Hiển thị{" "}
              <span className="font-medium">{startIndex + 1}</span> -{" "}
              <span className="font-medium">
                {Math.min(startIndex + itemsPerPage, filteredUsers.length)}
              </span>{" "}
              trên <span className="font-medium">{filteredUsers.length}</span> kết quả
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Trang trước"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>

              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }).map((_, idx) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = idx + 1;
                  } else if (currentPage <= 3) {
                    pageNum = idx + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + idx;
                  } else {
                    pageNum = currentPage - 2 + idx;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                        currentPage === pageNum
                          ? "bg-primary text-white"
                          : "border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Trang sau"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
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
