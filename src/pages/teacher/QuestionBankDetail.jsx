import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Button, Dropdown, Form, Input, message, Modal, Select, Spin, Table, Tag } from "antd";
import { ArrowDownTrayIcon, ArrowLeftIcon, ArrowUpTrayIcon, EllipsisHorizontalIcon, PencilSquareIcon, PlusCircleIcon, TagIcon, TrashIcon, UserPlusIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import TeacherHeader from "../../components/layout/TeacherHeader";
import TeacherSidebar from "../../components/layout/TeacherSidebar";
import AdminSidebar from "../../components/layout/AdminSidebar";
import { useAuth } from "../../contexts/AuthContext";
import {
  addMember,
  createQuestion,
  createTag,
  createTagsBatch,
  deleteQuestionBank,
  deleteQuestion,
  deleteTag,
  exportGiftQuestions,
  getMembers,
  getQuestionBankById,
  getTags,
  importGiftQuestions,
  removeMember,
  updateMemberRole,
  updateQuestion,
  updateQuestionBank,
  updateTag,
} from "../../api/questionBank";
import { searchUsers } from "../../api/user";
import QuestionModal from "../../components/teacher/QuestionModal";

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.content)) return value.content;
  return [];
};

const toObject = (value) => {
  if (value == null || typeof value !== "object") return null;
  if (value.data && typeof value.data === "object" && !Array.isArray(value.data)) {
    return value.data;
  }
  return value;
};

export default function QuestionBankDetail({ isAdmin = false }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();

  const [bank, setBank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [deleteBankLoading, setDeleteBankLoading] = useState(false);

  const [bankTags, setBankTags] = useState([]);
  const [tagModalTags, setTagModalTags] = useState([]);
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberActionLoading, setMemberActionLoading] = useState(false);
  const [memberSearchLoading, setMemberSearchLoading] = useState(false);
  const [memberSearchOptions, setMemberSearchOptions] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [selectedMemberRole, setSelectedMemberRole] = useState("EDITOR");

  const [tagModalVisible, setTagModalVisible] = useState(false);
  const [editingTag, setEditingTag] = useState(null);
  const [tagInput, setTagInput] = useState("");
  const [batchInput, setBatchInput] = useState("");
  const [tagSearchValue, setTagSearchValue] = useState("");
  const [questionTagFilterIds, setQuestionTagFilterIds] = useState([]);
  const [tagActionLoading, setTagActionLoading] = useState(false);
  const [tagSearchLoading, setTagSearchLoading] = useState(false);

  const [editBankModalVisible, setEditBankModalVisible] = useState(false);
  const [editBankLoading, setEditBankLoading] = useState(false);
  const [editBankForm] = Form.useForm();

  const giftFileInputRef = useRef(null);

  const effectiveRole = user?.role === "ADMIN" ? "OWNER" : bank?.myRole;
  const safeBankTags = useMemo(() => toArray(bankTags), [bankTags]);
  const safeTagModalTags = useMemo(() => toArray(tagModalTags), [tagModalTags]);
  const safeMembers = useMemo(() => toArray(members), [members]);
  const safeQuestions = useMemo(() => toArray(bank?.questions), [bank?.questions]);
  const canEditContent = effectiveRole === "OWNER" || effectiveRole === "EDITOR";
  const canManageTags = canEditContent;
  const canManageMembers = effectiveRole === "OWNER";
  const canDeleteBank = effectiveRole === "OWNER";

  useEffect(() => {
    const handleResize = () => setSidebarCollapsed(window.innerWidth < 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    fetchBank();
  }, [id]);

  useEffect(() => {
    if (tagModalVisible) {
      loadTagModalTags("");
      setTagSearchValue("");
    }
  }, [tagModalVisible, id]);

  useEffect(() => {
    if (canManageMembers) {
      fetchMembers();
    } else {
      setMembers([]);
    }
  }, [canManageMembers, id]);

  const fetchBankTags = async () => {
    try {
      const res = await getTags(id);
      setBankTags(toArray(res));
    } catch {
      // non-blocking
    }
  };

  const loadTagModalTags = async (search = "") => {
    try {
      setTagSearchLoading(true);
      const res = await getTags(id, search ? { search } : {});
      setTagModalTags(toArray(res));
    } catch {
      setTagModalTags([]);
    } finally {
      setTagSearchLoading(false);
    }
  };

  const fetchBank = async (tagIds = questionTagFilterIds) => {
    try {
      setLoading(true);
      const selectedTagIds = Array.isArray(tagIds) ? tagIds.filter(Boolean) : [];
      const params = selectedTagIds.length ? { tagIds: selectedTagIds.join(",") } : {};
      const [bankRes, tagsRes] = await Promise.all([getQuestionBankById(id, params), getTags(id)]);
      setBank(toObject(bankRes));
      setBankTags(toArray(tagsRes));
      setError(null);
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      setMembersLoading(true);
      const res = await getMembers(id);
      setMembers(toArray(res));
    } catch (err) {
      message.error(err?.response?.data?.message || t("questionBank.loi"));
    } finally {
      setMembersLoading(false);
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!canEditContent) return;
    if (!window.confirm(t("questionBank.xacNhanXoaCauHoi"))) return;
    try {
      await deleteQuestion(questionId);
      message.success(t("questionBank.xoaCauHoiThanhCong"));
      await fetchBank();
    } catch (err) {
      message.error(err?.response?.data?.message || t("questionBank.loi"));
    }
  };

  const handleSaveQuestion = async (values) => {
    if (!canEditContent) return;
    try {
      setSaveLoading(true);
      if (editingQuestion) {
        await updateQuestion(editingQuestion.id, values);
        message.success(t("questionBank.capNhatCauHoiThanhCong"));
      } else {
        await createQuestion(id, values);
        message.success(t("questionBank.themCauHoiThanhCong"));
      }
      setModalVisible(false);
      setEditingQuestion(null);
      await fetchBank();
    } catch (err) {
      message.error(err?.response?.data?.message || t("questionBank.loi"));
    } finally {
      setSaveLoading(false);
    }
  };

  const handleEditQuestion = (record) => {
    if (!canEditContent) return;
    setEditingQuestion(record);
    setModalVisible(true);
  };

  const handleSaveTag = async () => {
    const name = tagInput.trim();
    if (!name || !canManageTags) return;

    const runSave = async () => {
      try {
        setTagActionLoading(true);
        if (editingTag) {
          await updateTag(id, editingTag.id, { name });
          message.success(t("questionBank.daCapNhatTag"));
        } else {
          await createTag(id, { name });
          message.success(t("questionBank.daTaoTag"));
        }
        setTagInput("");
        setEditingTag(null);
        await loadTagModalTags(tagSearchValue);
        if (editingTag) {
          await fetchBank();
        } else {
          await fetchBankTags();
        }
      } catch (err) {
        message.error(err?.response?.data?.message || t("questionBank.loi"));
      } finally {
        setTagActionLoading(false);
      }
    };

    if (editingTag && editingTag.totalUsageCount > 0 && editingTag.name !== name) {
      Modal.confirm({
        title: t("questionBank.canhBaoDoiTenTag"),
        content: t("questionBank.tagDangDuocDung", { name: editingTag.name, q: editingTag.questionUsageCount || 0, r: editingTag.quizUsageCount || 0 }),
        onOk: runSave,
      });
      return;
    }

    await runSave();
  };

  const handleDeleteTag = (tag) => {
    if (!canManageTags) return;
    const questionUsageCount = tag?.questionUsageCount || 0;
    const quizUsageCount = tag?.quizUsageCount || 0;

    Modal.confirm({
      title: t("questionBank.xacNhanXoaTag"),
      content: t("questionBank.tagDangDuocDungXoa", { name: tag?.name, q: questionUsageCount, r: quizUsageCount }),
      onOk: async () => {
        try {
          setTagActionLoading(true);
          const nextFilterIds = questionTagFilterIds.filter((selectedTagId) => selectedTagId !== tag.id);
          if (nextFilterIds.length !== questionTagFilterIds.length) {
            setQuestionTagFilterIds(nextFilterIds);
          }
          await deleteTag(id, tag.id);
          message.success(t("questionBank.daXoaTag"));
          await fetchBank(nextFilterIds);
          await fetchBankTags();
          await loadTagModalTags(tagSearchValue);
        } catch (err) {
          message.error(err?.response?.data?.message || t("questionBank.loi"));
        } finally {
          setTagActionLoading(false);
        }
      },
    });
  };

  const handleOpenTagModal = async () => {
    setEditingTag(null);
    setTagInput("");
    setBatchInput("");
    setTagModalVisible(true);
  };

  const handleQuestionTagFilterChange = async (value) => {
    const nextTagIds = Array.isArray(value) ? value : [];
    setQuestionTagFilterIds(nextTagIds);
    await fetchBank(nextTagIds);
  };

  const handleBatchCreate = async () => {
    if (!canManageTags) return;
    const names = batchInput
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!names.length) return;
    try {
      setTagActionLoading(true);
      await createTagsBatch(id, names);
      message.success(t("questionBank.daTaoTagHangLoat", { count: names.length }));
      setBatchInput("");
      await fetchBankTags();
    } catch (err) {
      message.error(err?.response?.data?.message || t("questionBank.loi"));
    } finally {
      setTagActionLoading(false);
    }
  };

  const handlePickGiftFile = () => {
    if (!canEditContent) return;
    giftFileInputRef.current?.click();
  };

  const handleGiftFileSelected = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !canEditContent) return;

    try {
      setImportLoading(true);
      const response = await importGiftQuestions(id, file);
      const result = toObject(response) || {};
      const imported = result?.importedQuestions ?? 0;
      const skipped = result?.skippedQuestions ?? 0;

      message.success(t("questionBank.importThanhCong", `Đã import ${imported} câu hỏi`));
      if (skipped > 0) {
        Modal.warning({
          title: t("questionBank.coCauHoiBoQua", `Có ${skipped} câu bị bỏ qua`),
          content: (
            <div className="whitespace-pre-wrap max-h-64 overflow-auto text-xs leading-5">
              {(result?.warnings || []).join("\n") || t("questionBank.importCanhBao", "Một số câu hỏi không đúng định dạng GIFT/AIKEN được hỗ trợ.")}
            </div>
          ),
          width: 640,
        });
      }
      await fetchBank();
    } catch (err) {
      message.error(err?.response?.data?.message || t("questionBank.importThatBai", "Import GIFT/AIKEN thất bại"));
    } finally {
      setImportLoading(false);
    }
  };

  const handleExportGift = async () => {
    if (!canEditContent) return;
    try {
      setExportLoading(true);
      const response = await exportGiftQuestions(id);
      const blob = new Blob([response.data], { type: "text/plain;charset=utf-8" });
      const disposition = response.headers?.["content-disposition"] || "";
      const match = /filename=\"?([^\"]+)\"?/i.exec(disposition);
      const filename = match?.[1] || `question-bank-${id}.gift.txt`;

      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(downloadUrl);
      message.success(t("questionBank.exportThanhCong", "Đã export GIFT"));
    } catch (err) {
      message.error(err?.response?.data?.message || t("questionBank.exportThatBai", "Export GIFT thất bại"));
    } finally {
      setExportLoading(false);
    }
  };

  const handleDeleteBank = () => {
    if (!canDeleteBank) return;
    Modal.confirm({
      title: t("questionBank.xacNhanXoaBank"),
      content: t("questionBank.hanhDongKhongHoanTac"),
      okButtonProps: { danger: true, loading: deleteBankLoading },
      onOk: async () => {
        try {
          setDeleteBankLoading(true);
          await deleteQuestionBank(id);
          message.success(t("questionBank.xoaBankThanhCong"));
          navigate(isAdmin ? "/admin/question-banks" : "/teacher/question-banks");
        } catch (err) {
          message.error(err?.response?.data?.message || t("questionBank.loi"));
        } finally {
          setDeleteBankLoading(false);
        }
      },
    });
  };

  const handleOpenEditBank = () => {
    editBankForm.setFieldsValue({ name: bank.name, description: bank.description || "" });
    setEditBankModalVisible(true);
  };

  const handleUpdateBank = async () => {
    try {
      const values = await editBankForm.validateFields();
      setEditBankLoading(true);
      await updateQuestionBank(id, values);
      message.success(t("questionBank.capNhatThongTinThanhCong"));
      setEditBankModalVisible(false);
      await fetchBank();
    } catch (err) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.message || t("questionBank.loi"));
    } finally {
      setEditBankLoading(false);
    }
  };

  const loadMemberSearchOptions = async (keyword) => {
    const query = keyword?.trim();
    if (!query || !canManageMembers) {
      setMemberSearchOptions([]);
      return;
    }

    try {
      setMemberSearchLoading(true);
      const res = await searchUsers({
        pageNumber: 1,
        pageSize: 10,
        userName: query,
        fullName: query,
      });
      const payload = res?.data ?? res;
      const users = Array.isArray(payload?.pageList)
        ? payload.pageList
        : Array.isArray(payload)
          ? payload
          : [];
      const existingIds = new Set(safeMembers.map((m) => m.userId));
      setMemberSearchOptions(
        users
          .filter((item) => item?.id && !existingIds.has(item.id))
          .map((item) => ({
            value: item.id,
            label: `${item.fullName || item.userName} (${item.userName})`,
          }))
      );
    } catch {
      setMemberSearchOptions([]);
    } finally {
      setMemberSearchLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!canManageMembers || !selectedMemberId) return;
    try {
      setMemberActionLoading(true);
      await addMember(id, { userId: selectedMemberId, role: selectedMemberRole });
      message.success(t("questionBank.daThemThanhVien"));
      setSelectedMemberId(null);
      setMemberSearchOptions([]);
      await Promise.all([fetchMembers(), fetchBank()]);
    } catch (err) {
      message.error(err?.response?.data?.message || t("questionBank.loi"));
    } finally {
      setMemberActionLoading(false);
    }
  };

  const handleSetMemberRole = (member, role) => {
    if (!canManageMembers) return;

    const isTransferOwner = role === "OWNER";
    Modal.confirm({
      title: isTransferOwner ? t("questionBank.xacNhanChuyenOwner") : t("questionBank.xacNhanCapNhatRole"),
      content: isTransferOwner
        ? t("questionBank.chuyenOwnerChoUser", { name: member?.fullName || member?.userName })
        : t("questionBank.capNhatRoleChoUser", { name: member?.fullName || member?.userName, role }),
      onOk: async () => {
        try {
          setMemberActionLoading(true);
          await updateMemberRole(id, member.userId, { role });
          message.success(t("questionBank.daCapNhatRole"));
          await Promise.all([fetchMembers(), fetchBank()]);
        } catch (err) {
          message.error(err?.response?.data?.message || t("questionBank.loi"));
        } finally {
          setMemberActionLoading(false);
        }
      },
    });
  };

  const handleRemoveMember = (member) => {
    if (!canManageMembers) return;
    Modal.confirm({
      title: t("questionBank.xacNhanXoaThanhVien"),
      content: t("questionBank.xoaThanhVienKhoiBank", { name: member?.fullName || member?.userName }),
      onOk: async () => {
        try {
          setMemberActionLoading(true);
          await removeMember(id, member.userId);
          message.success(t("questionBank.daXoaThanhVien"));
          await Promise.all([fetchMembers(), fetchBank()]);
        } catch (err) {
          message.error(err?.response?.data?.message || t("questionBank.loi"));
        } finally {
          setMemberActionLoading(false);
        }
      },
    });
  };

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
    },
    {
      title: t("questionBank.noiDungCauHoi"),
      dataIndex: "content",
      key: "content",
      render: (text) => <div className="line-clamp-2 max-w-md" dangerouslySetInnerHTML={{ __html: text }} />,
    },
    {
      title: t("questionBank.loai"),
      dataIndex: "type",
      key: "type",
      render: (type) => <Tag color="blue">{type}</Tag>,
    },
    {
      title: t("questionBank.doKho"),
      dataIndex: "difficultyLevel",
      key: "difficultyLevel",
      render: (diff) => {
        const color = diff === "EASY" ? "green" : diff === "MEDIUM" ? "orange" : "red";
        return <Tag color={color}>{diff}</Tag>;
      },
    },
    {
      title: t("questionBank.tags"),
      dataIndex: "tags",
      key: "tags",
      render: (tags) => (
        <div className="flex flex-wrap gap-1">
          {(tags || []).map((tag) => (
            <Tag key={tag.id} color="geekblue">{tag.name}</Tag>
          ))}
        </div>
      ),
    },
  ];

  if (canEditContent) {
    columns.push({
      title: t("questionBank.hanhDong"),
      key: "action",
      render: (_, record) => (
        <div className="flex gap-2">
          <Button size="small" onClick={() => handleEditQuestion(record)}>
            {t("questionBank.sua")}
          </Button>
          <Button size="small" danger onClick={() => handleDeleteQuestion(record.id)}>
            {t("questionBank.xoa")}
          </Button>
        </div>
      ),
    });
  }

  const actionMenuItems = [
    ...(canManageTags ? [{
      key: 'manage_tags',
      icon: <TagIcon className="w-4 h-4" />,
      label: t("questionBank.quanLyTag") || "Quản lý tag",
      onClick: handleOpenTagModal,
    }] : []),
    ...(canEditContent ? [{
      key: 'import_gift',
      icon: <ArrowUpTrayIcon className="w-4 h-4" />,
      label: t("questionBank.importGiftAiken") || "Import GIFT/AIKEN (.txt)",
      onClick: handlePickGiftFile,
    },
    {
      key: 'export_gift',
      icon: <ArrowDownTrayIcon className="w-4 h-4" />,
      label: t("questionBank.exportGift") || "Export GIFT (.txt)",
      onClick: handleExportGift,
    }] : []),
    ...(canDeleteBank ? [
      { type: 'divider', key: 'divider' },
      {
        key: 'delete_bank',
        danger: true,
        icon: <TrashIcon className="w-4 h-4" />,
        label: t("questionBank.xoaBank") || "Xóa bank",
        onClick: handleDeleteBank,
      }
    ] : [])
  ];

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-[#111418] dark:text-white">
      <TeacherHeader />
      <div className="flex">
        {isAdmin ? <AdminSidebar /> : <TeacherSidebar />}
        <main className={`flex-1 pt-16 bg-slate-50 dark:bg-slate-900 transition-all duration-300 ${sidebarCollapsed ? "pl-20" : "pl-64"}`}>
          <div className="px-6 py-8 mx-auto max-w-5xl">
            <div className="mb-4">
              <Button type="link" icon={<ArrowLeftIcon className="w-4 h-4" />} onClick={() => navigate(-1)} className="p-0 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                {t("questionBank.quayLai") || "Quay lại"}
              </Button>
            </div>

            {loading ? (
              <div className="flex justify-center p-10">
                <Spin size="large" />
              </div>
            ) : error ? (
              <Alert type="error" message={t("questionBank.loi")} description={error} />
            ) : bank ? (
              <>
                <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
                  <div className="flex items-start gap-4">

                    <div>
                      <h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight flex flex-wrap items-center gap-2">
                        {bank.name}
                        <Tag className="ml-1 !mr-0 border-0 shadow-sm" color={effectiveRole === "OWNER" ? "gold" : effectiveRole === "EDITOR" ? "blue" : "default"}>
                          {effectiveRole || "VIEWER"}
                        </Tag>
                      </h1>
                      <p className="text-gray-500 mt-1.5 text-sm">{bank.description || t("questionBank.khongCoMoTa")}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                    <input
                      ref={giftFileInputRef}
                      type="file"
                      accept=".txt,text/plain"
                      className="hidden"
                      onChange={handleGiftFileSelected}
                    />
                    <Button
                      onClick={() => navigate(`${isAdmin ? "/admin" : "/teacher"}/question-banks/${id}/media`)}
                      className="h-9 rounded-full border-blue-200 text-blue-600 hover:bg-blue-50"
                    >
                      Media bank
                    </Button>
                    
                    {actionMenuItems.length > 0 && (
                      <Dropdown menu={{ items: actionMenuItems }} trigger={['click']} placement="bottomRight">
                        <Button className="flex items-center justify-center rounded-full px-2.5 bg-white border-gray-200 hover:bg-gray-50 shadow-sm h-9">
                           <EllipsisHorizontalIcon className="w-5 h-5 text-gray-600" />
                        </Button>
                      </Dropdown>
                    )}

                    {canEditContent && (
                      <Button
                        type="primary"
                        icon={<PlusCircleIcon className="w-5 h-5" />}
                        className="flex items-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 border-0 px-5 shadow-sm h-9"
                        onClick={() => {
                          setEditingQuestion(null);
                          setModalVisible(true);
                        }}
                      >
                        {t("questionBank.themCauHoi")}
                      </Button>
                    )}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="m-0 text-sm font-semibold text-slate-700 dark:text-slate-200">{t("questionBank.danhSachCauHoi")}</p>
                      <p className="m-0 text-xs text-slate-500">
                        {questionTagFilterIds.length > 0
                          ? t("questionBank.cauHoiKhopTag", { count: safeQuestions.length, selected: questionTagFilterIds.length })
                          : t("questionBank.cauHoiTrongBank", { count: safeQuestions.length })}
                      </p>
                    </div>
                    <div className="w-full sm:w-80">
                      <Select
                        allowClear
                        showSearch
                        mode="multiple"
                        maxTagCount="responsive"
                        value={questionTagFilterIds}
                        onChange={handleQuestionTagFilterChange}
                        placeholder={t("questionBank.locTheoTag")}
                        options={safeBankTags.map((tag) => ({
                          value: tag.id,
                          label: tag.name,
                        }))}
                        optionFilterProp="label"
                        className="w-full"
                      />
                    </div>
                  </div>
                  <Table dataSource={safeQuestions} columns={columns} rowKey="id" pagination={{ pageSize: 15 }} />
                </div>

                {canManageMembers && (
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mt-6">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">{t("questionBank.thanhVienNganHang")}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_auto] gap-3 mb-5">
                      <Select
                        showSearch
                        placeholder={t("questionBank.timUser")}
                        value={selectedMemberId}
                        options={memberSearchOptions}
                        filterOption={false}
                        onSearch={loadMemberSearchOptions}
                        onChange={setSelectedMemberId}
                        notFoundContent={memberSearchLoading ? <Spin size="small" /> : null}
                        allowClear
                      />
                      <Select
                        value={selectedMemberRole}
                        onChange={setSelectedMemberRole}
                        showSearch
                        optionFilterProp="label"
                        options={[
                          { value: "EDITOR", label: "EDITOR" },
                          { value: "VIEWER", label: "VIEWER" },
                        ]}
                      />
                      <Button type="primary" icon={<UserPlusIcon className="w-4 h-4" />} loading={memberActionLoading} onClick={handleAddMember} className="bg-blue-600 hover:bg-blue-700 h-8">
                        {t("questionBank.them")}
                      </Button>
                    </div>

                    <Table
                      rowKey="id"
                      loading={membersLoading}
                      dataSource={safeMembers}
                      pagination={false}
                      className="border border-gray-100 dark:border-gray-800 rounded-md overflow-hidden"
                      columns={[
                        {
                          title: t("common.thanhVien", "Thành viên"),
                          key: "user",
                          render: (_, record) => (
                            <div>
                              <div className="font-medium">{record.fullName || record.userName}</div>
                              <div className="text-xs text-slate-500">{record.userName}</div>
                            </div>
                          ),
                        },
                        {
                          title: t("questionBank.role"),
                          dataIndex: "role",
                          key: "role",
                          render: (role) => <Tag color={role === "OWNER" ? "gold" : role === "EDITOR" ? "blue" : "default"} className="m-0 font-medium">{role}</Tag>,
                        },
                        {
                          title: t("questionBank.hanhDong"),
                          key: "action",
                          render: (_, record) => {
                            if (record.role === "OWNER") {
                              return <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">{t("questionBank.ownerHienTai")}</span>;
                            }
                            return (
                              <div className="flex flex-wrap gap-2">
                                {record.role !== "EDITOR" && (
                                  <Button size="small" onClick={() => handleSetMemberRole(record, "EDITOR")} loading={memberActionLoading} className="text-xs">
                                    {t("questionBank.datRoleEditor")}
                                  </Button>
                                )}
                                {record.role !== "VIEWER" && (
                                  <Button size="small" onClick={() => handleSetMemberRole(record, "VIEWER")} loading={memberActionLoading} className="text-xs">
                                    {t("questionBank.datRoleViewer")}
                                  </Button>
                                )}
                                <Button size="small" onClick={() => handleSetMemberRole(record, "OWNER")} loading={memberActionLoading} className="text-xs text-amber-600 border-amber-200 hover:bg-amber-50 hover:border-amber-400">
                                  {t("questionBank.chuyenOwner")}
                                </Button>
                                <Button size="small" danger onClick={() => handleRemoveMember(record)} loading={memberActionLoading} className="text-xs">
                                  {t("questionBank.xoa")}
                                </Button>
                              </div>
                            );
                          },
                        },
                      ]}
                    />
                  </div>
                )}

                <QuestionModal
                  open={modalVisible}
                  onCancel={() => {
                    setModalVisible(false);
                    setEditingQuestion(null);
                  }}
                  onFinish={handleSaveQuestion}
                  initialValues={editingQuestion}
                  loading={saveLoading}
                  existingTags={safeBankTags}
                  questionBankId={id}
                />

                <Modal
                  title={<span className="text-lg font-bold text-gray-800 dark:text-gray-100">{t("questionBank.quanLyTag")}</span>}
                  open={tagModalVisible}
                  onCancel={() => {
                    setTagModalVisible(false);
                    setEditingTag(null);
                    setTagInput("");
                    setBatchInput("");
                  }}
                  footer={null}
                  width={560}
                  destroyOnHidden
                  className="rounded-xl overflow-hidden"
                >
                  <div className="mb-4">
                    <Input.Search
                      value={tagSearchValue}
                      onChange={(e) => setTagSearchValue(e.target.value)}
                      onSearch={loadTagModalTags}
                      loading={tagSearchLoading}
                      allowClear
                          placeholder={t("questionBank.timTag")}
                    />
                  </div>
                  <div className="mb-5 max-h-64 overflow-y-auto space-y-2 pr-1">
                    {tagSearchLoading && safeTagModalTags.length === 0 ? (
                      <div className="flex justify-center py-8">
                        <Spin size="small" />
                      </div>
                    ) : safeTagModalTags.length === 0 ? (
                      <div className="text-center py-6 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-gray-200 dark:border-slate-700">
                        <TagIcon className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t("questionBank.chuaCoTag")}</p>
                      </div>
                    ) : (
                      safeTagModalTags.map((tag) => (
                        <div
                          key={tag.id}
                          className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                            <Tag color="geekblue" className="m-0 w-fit">{tag.name}</Tag>
                            <span className="text-xs text-slate-500 font-medium">
                              {t("questionBank.cauHoiVaQuizRule", { q: tag.questionUsageCount || 0, r: tag.quizUsageCount || 0 })}
                            </span>
                          </div>
                          {canManageTags && (
                            <div className="flex gap-1">
                              <Button
                                size="small"
                                onClick={() => {
                                  setEditingTag(tag);
                                  setTagInput(tag.name);
                                }}
                              >
                                {t("questionBank.sua")}
                              </Button>
                              <Button
                                size="small"
                                danger
                                loading={tagActionLoading}
                                onClick={() => handleDeleteTag(tag)}
                                className="text-xs"
                              >
                                {t("questionBank.xoa")}
                              </Button>
                            </div>
                          )}
                        </div>
                      ))
                    )
                    }
                  </div>

                  {canManageTags && (
                    <div className="border-t border-gray-100 dark:border-slate-700 pt-5 mb-5">
                      <p className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
                        <PencilSquareIcon className="w-4 h-4 text-blue-500" />
                        {editingTag ? t("questionBank.dangSuaTag", { name: editingTag.name }) : t("questionBank.taoTagMoi")}
                      </p>
                      <div className="flex gap-2">
                        <Input
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          placeholder={t("questionBank.tenTag")}
                          onPressEnter={handleSaveTag}
                          className="flex-1 rounded-lg"
                        />
                        <Button
                          type="primary"
                          loading={tagActionLoading}
                          onClick={handleSaveTag}
                          className="rounded-lg bg-blue-600 hover:bg-blue-700"
                        >
                          {editingTag ? t("questionBank.capNhat") : t("questionBank.taoMoi", "Tạo mới")}
                        </Button>
                        {editingTag && (
                          <Button onClick={() => { setEditingTag(null); setTagInput(""); }} className="rounded-lg">
                            {t("questionBank.huy")}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {canManageTags && (
                    <div className="border-t border-gray-100 dark:border-slate-700 pt-5">
                      <p className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
                         <PlusCircleIcon className="w-4 h-4 text-emerald-500" />
                         {t("questionBank.taoNhieuTag")}
                      </p>
                      <Input.TextArea
                        rows={3}
                        value={batchInput}
                        onChange={(e) => setBatchInput(e.target.value)}
                        placeholder="chuong-1, chuong-2&#10;dinh-ly-pythagore"
                      />
                      <Button
                        className="mt-3 rounded-lg bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 font-medium"
                        loading={tagActionLoading}
                        onClick={handleBatchCreate}
                        icon={<PlusCircleIcon className="w-4 h-4" />}
                      >
                        {t("questionBank.taoHangLoat")}
                      </Button>
                    </div>
                  )}
                </Modal>
              </>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}
