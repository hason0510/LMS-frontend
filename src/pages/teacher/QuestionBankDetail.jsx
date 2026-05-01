import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Button, Input, message, Modal, Select, Spin, Table, Tag } from "antd";
import { ArrowDownTrayIcon, ArrowLeftIcon, PlusCircleIcon, TagIcon, TrashIcon, UserPlusIcon } from "@heroicons/react/24/outline";
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
  updateTag,
} from "../../api/questionBank";
import { searchUsers } from "../../api/user";
import QuestionModal from "../../components/teacher/QuestionModal";

export default function QuestionBankDetail({ isAdmin = false }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

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
  const [tagActionLoading, setTagActionLoading] = useState(false);

  const giftFileInputRef = useRef(null);

  const effectiveRole = user?.role === "ADMIN" ? "OWNER" : bank?.myRole;
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
    if (canManageMembers) {
      fetchMembers();
    } else {
      setMembers([]);
    }
  }, [canManageMembers, id]);

  const fetchBankTags = async () => {
    try {
      const res = await getTags(id);
      setBankTags(res?.data || res || []);
    } catch {
      // non-blocking
    }
  };

  const fetchBank = async () => {
    try {
      setLoading(true);
      const [bankRes, tagsRes] = await Promise.all([getQuestionBankById(id), getTags(id)]);
      setBank(bankRes?.data || bankRes);
      setBankTags(tagsRes?.data || tagsRes || []);
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
      setMembers(res?.data || res || []);
    } catch (err) {
      message.error(err?.response?.data?.message || "Loi khi tai danh sach thanh vien");
    } finally {
      setMembersLoading(false);
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!canEditContent) return;
    if (!window.confirm("Ban co chac chan muon xoa cau hoi nay?")) return;
    try {
      await deleteQuestion(questionId);
      message.success("Da xoa cau hoi");
      await fetchBank();
    } catch (err) {
      message.error(err?.response?.data?.message || "Loi khi xoa cau hoi");
    }
  };

  const handleSaveQuestion = async (values) => {
    if (!canEditContent) return;
    try {
      setSaveLoading(true);
      if (editingQuestion) {
        await updateQuestion(editingQuestion.id, values);
        message.success("Cap nhat cau hoi thanh cong");
      } else {
        await createQuestion(id, values);
        message.success("Them cau hoi thanh cong");
      }
      setModalVisible(false);
      setEditingQuestion(null);
      await fetchBank();
    } catch (err) {
      message.error(err?.response?.data?.message || "Loi khi luu cau hoi");
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
          message.success("Da cap nhat tag");
        } else {
          await createTag(id, { name });
          message.success("Da tao tag");
        }
        setTagInput("");
        setEditingTag(null);
        if (editingTag) {
          await fetchBank();
          await fetchBankTags();
        } else {
          await fetchBankTags();
        }
      } catch (err) {
        message.error(err?.response?.data?.message || "Loi khi luu tag");
      } finally {
        setTagActionLoading(false);
      }
    };

    if (editingTag && editingTag.totalUsageCount > 0 && editingTag.name !== name) {
      Modal.confirm({
        title: "Canh bao doi ten tag",
        content: `Tag "${editingTag.name}" dang duoc dung boi ${editingTag.questionUsageCount || 0} cau hoi va ${editingTag.quizUsageCount || 0} quiz rule. Doi ten se anh huong tat ca ban ghi dang dung tag nay.`,
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
      title: "Xac nhan xoa tag",
      content: `Tag "${tag?.name}" dang duoc dung boi ${questionUsageCount} cau hoi va ${quizUsageCount} quiz rule.`,
      onOk: async () => {
        try {
          setTagActionLoading(true);
          await deleteTag(id, tag.id);
          message.success("Da xoa tag");
          await fetchBank();
          await fetchBankTags();
        } catch (err) {
          message.error(err?.response?.data?.message || "Khong the xoa tag");
        } finally {
          setTagActionLoading(false);
        }
      },
    });
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
      message.success(`Da tao ${names.length} tag`);
      setBatchInput("");
      await fetchBankTags();
    } catch (err) {
      message.error(err?.response?.data?.message || "Loi khi tao batch tag");
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
      const result = response?.data || response;
      const imported = result?.importedQuestions ?? 0;
      const skipped = result?.skippedQuestions ?? 0;

      message.success(`Da import ${imported} cau hoi`);
      if (skipped > 0) {
        Modal.warning({
          title: `Co ${skipped} cau bi bo qua`,
          content: (
            <div className="whitespace-pre-wrap max-h-64 overflow-auto text-xs leading-5">
              {(result?.warnings || []).join("\n") || "Mot so cau hoi khong dung dinh dang GIFT/AIKEN duoc ho tro."}
            </div>
          ),
          width: 640,
        });
      }
      await fetchBank();
    } catch (err) {
      message.error(err?.response?.data?.message || "Import GIFT/AIKEN that bai");
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
      message.success("Da export GIFT");
    } catch (err) {
      message.error(err?.response?.data?.message || "Export GIFT that bai");
    } finally {
      setExportLoading(false);
    }
  };

  const handleDeleteBank = () => {
    if (!canDeleteBank) return;
    Modal.confirm({
      title: "Xac nhan xoa question bank",
      content: "Hanh dong nay khong the hoan tac.",
      okButtonProps: { danger: true, loading: deleteBankLoading },
      onOk: async () => {
        try {
          setDeleteBankLoading(true);
          await deleteQuestionBank(id);
          message.success("Da xoa question bank");
          navigate(isAdmin ? "/admin/question-banks" : "/teacher/question-banks");
        } catch (err) {
          message.error(err?.response?.data?.message || "Khong the xoa question bank");
        } finally {
          setDeleteBankLoading(false);
        }
      },
    });
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
      const payload = res?.data || res;
      const users = payload?.pageList || [];
      const existingIds = new Set((members || []).map((m) => m.userId));
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
      message.success("Da them thanh vien");
      setSelectedMemberId(null);
      setMemberSearchOptions([]);
      await Promise.all([fetchMembers(), fetchBank()]);
    } catch (err) {
      message.error(err?.response?.data?.message || "Loi khi them thanh vien");
    } finally {
      setMemberActionLoading(false);
    }
  };

  const handleSetMemberRole = (member, role) => {
    if (!canManageMembers) return;

    const isTransferOwner = role === "OWNER";
    Modal.confirm({
      title: isTransferOwner ? "Xac nhan chuyen quyen so huu" : "Xac nhan cap nhat role",
      content: isTransferOwner
        ? `Ban se chuyen OWNER cho ${member?.fullName || member?.userName}.`
        : `Cap nhat role cua ${member?.fullName || member?.userName} thanh ${role}.`,
      onOk: async () => {
        try {
          setMemberActionLoading(true);
          await updateMemberRole(id, member.userId, { role });
          message.success("Da cap nhat role");
          await Promise.all([fetchMembers(), fetchBank()]);
        } catch (err) {
          message.error(err?.response?.data?.message || "Loi khi cap nhat role");
        } finally {
          setMemberActionLoading(false);
        }
      },
    });
  };

  const handleRemoveMember = (member) => {
    if (!canManageMembers) return;
    Modal.confirm({
      title: "Xac nhan xoa thanh vien",
      content: `Xoa ${member?.fullName || member?.userName} khoi question bank?`,
      onOk: async () => {
        try {
          setMemberActionLoading(true);
          await removeMember(id, member.userId);
          message.success("Da xoa thanh vien");
          await Promise.all([fetchMembers(), fetchBank()]);
        } catch (err) {
          message.error(err?.response?.data?.message || "Loi khi xoa thanh vien");
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
      title: "Noi dung cau hoi",
      dataIndex: "content",
      key: "content",
      render: (text) => <div className="line-clamp-2 max-w-md" dangerouslySetInnerHTML={{ __html: text }} />,
    },
    {
      title: "Loai",
      dataIndex: "type",
      key: "type",
      render: (type) => <Tag color="blue">{type}</Tag>,
    },
    {
      title: "Do kho",
      dataIndex: "difficultyLevel",
      key: "difficultyLevel",
      render: (diff) => {
        const color = diff === "EASY" ? "green" : diff === "MEDIUM" ? "orange" : "red";
        return <Tag color={color}>{diff}</Tag>;
      },
    },
    {
      title: "Tags",
      dataIndex: "tags",
      key: "tags",
      render: (tags) => (
        <div className="flex flex-wrap gap-1">
          {(tags || []).map((t) => (
            <Tag key={t.id} color="geekblue">{t.name}</Tag>
          ))}
        </div>
      ),
    },
  ];

  if (canEditContent) {
    columns.push({
      title: "Hanh dong",
      key: "action",
      render: (_, record) => (
        <div className="flex gap-2">
          <Button size="small" onClick={() => handleEditQuestion(record)}>
            Sua
          </Button>
          <Button size="small" danger onClick={() => handleDeleteQuestion(record.id)}>
            Xoa
          </Button>
        </div>
      ),
    });
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-[#111418] dark:text-white">
      <TeacherHeader />
      <div className="flex">
        {isAdmin ? <AdminSidebar /> : <TeacherSidebar />}
        <main className={`flex-1 pt-16 bg-slate-50 dark:bg-slate-900 transition-all duration-300 ${sidebarCollapsed ? "pl-20" : "pl-64"}`}>
          <div className="px-6 py-8 mx-auto max-w-5xl">
            <div className="mb-4">
              <Button type="link" icon={<ArrowLeftIcon className="w-4 h-4" />} onClick={() => navigate(-1)} className="p-0">
                Quay lai
              </Button>
            </div>

            {loading ? (
              <div className="flex justify-center p-10">
                <Spin size="large" />
              </div>
            ) : error ? (
              <Alert type="error" message="Loi" description={error} />
            ) : bank ? (
              <>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h1 className="text-2xl font-bold">{bank.name}</h1>
                    <p className="text-gray-500">{bank.description}</p>
                    <div className="mt-1">
                      <Tag color={effectiveRole === "OWNER" ? "gold" : effectiveRole === "EDITOR" ? "blue" : "default"}>
                        {effectiveRole || "VIEWER"}
                      </Tag>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      ref={giftFileInputRef}
                      type="file"
                      accept=".txt,text/plain"
                      className="hidden"
                      onChange={handleGiftFileSelected}
                    />
                    {canManageTags && (
                      <Button
                        icon={<TagIcon className="w-4 h-4" />}
                        className="flex items-center gap-1"
                        onClick={() => setTagModalVisible(true)}
                      >
                        Quan ly tag
                      </Button>
                    )}
                    {canEditContent && (
                      <Button onClick={handlePickGiftFile} loading={importLoading}>
                        Import GIFT/AIKEN (.txt)
                      </Button>
                    )}
                    {canEditContent && (
                      <Button icon={<ArrowDownTrayIcon className="w-4 h-4" />} loading={exportLoading} onClick={handleExportGift}>
                        Export GIFT (.txt)
                      </Button>
                    )}
                    {canEditContent && (
                      <Button
                        type="primary"
                        icon={<PlusCircleIcon className="w-5 h-5" />}
                        className="flex items-center gap-2"
                        onClick={() => {
                          setEditingQuestion(null);
                          setModalVisible(true);
                        }}
                      >
                        Them cau hoi
                      </Button>
                    )}
                    {canDeleteBank && (
                      <Button danger icon={<TrashIcon className="w-4 h-4" />} onClick={handleDeleteBank}>
                        Xoa bank
                      </Button>
                    )}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <Table dataSource={bank.questions || []} columns={columns} rowKey="id" pagination={{ pageSize: 15 }} />
                </div>

                {canManageMembers && (
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mt-6">
                    <h3 className="text-lg font-semibold mb-4">Thanh vien question bank</h3>
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_auto] gap-2 mb-4">
                      <Select
                        showSearch
                        placeholder="Tim user de them vao bank"
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
                        options={[
                          { value: "EDITOR", label: "EDITOR" },
                          { value: "VIEWER", label: "VIEWER" },
                        ]}
                      />
                      <Button type="primary" icon={<UserPlusIcon className="w-4 h-4" />} loading={memberActionLoading} onClick={handleAddMember}>
                        Them
                      </Button>
                    </div>

                    <Table
                      rowKey="id"
                      loading={membersLoading}
                      dataSource={members || []}
                      pagination={false}
                      columns={[
                        {
                          title: "Thanh vien",
                          key: "user",
                          render: (_, record) => (
                            <div>
                              <div className="font-medium">{record.fullName || record.userName}</div>
                              <div className="text-xs text-slate-500">{record.userName}</div>
                            </div>
                          ),
                        },
                        {
                          title: "Role",
                          dataIndex: "role",
                          key: "role",
                          render: (role) => <Tag color={role === "OWNER" ? "gold" : role === "EDITOR" ? "blue" : "default"}>{role}</Tag>,
                        },
                        {
                          title: "Hanh dong",
                          key: "action",
                          render: (_, record) => {
                            if (record.role === "OWNER") {
                              return <span className="text-xs text-slate-500">Owner hien tai</span>;
                            }
                            return (
                              <div className="flex flex-wrap gap-2">
                                {record.role !== "EDITOR" && (
                                  <Button size="small" onClick={() => handleSetMemberRole(record, "EDITOR")} loading={memberActionLoading}>
                                    Set EDITOR
                                  </Button>
                                )}
                                {record.role !== "VIEWER" && (
                                  <Button size="small" onClick={() => handleSetMemberRole(record, "VIEWER")} loading={memberActionLoading}>
                                    Set VIEWER
                                  </Button>
                                )}
                                <Button size="small" onClick={() => handleSetMemberRole(record, "OWNER")} loading={memberActionLoading}>
                                  Chuyen OWNER
                                </Button>
                                <Button size="small" danger onClick={() => handleRemoveMember(record)} loading={memberActionLoading}>
                                  Xoa
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
                  visible={modalVisible}
                  onCancel={() => {
                    setModalVisible(false);
                    setEditingQuestion(null);
                  }}
                  onFinish={handleSaveQuestion}
                  initialValues={editingQuestion}
                  loading={saveLoading}
                  existingTags={bankTags}
                  questionBankId={id}
                />

                <Modal
                  title="Quan ly tag"
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
                >
                  <div className="mb-4 max-h-56 overflow-y-auto space-y-1">
                    {bankTags.length === 0 && (
                      <p className="text-sm text-gray-400">Chua co tag nao.</p>
                    )}
                    {bankTags.map((t) => (
                      <div key={t.id} className="flex items-center justify-between gap-2 px-3 py-1.5 rounded bg-slate-50 dark:bg-slate-800">
                        <div className="flex items-center gap-2">
                          <Tag color="geekblue">{t.name}</Tag>
                          <span className="text-xs text-slate-500">
                            {t.questionUsageCount || 0} cau hoi, {t.quizUsageCount || 0} quiz rule
                          </span>
                        </div>
                        {canManageTags && (
                          <div className="flex gap-1">
                            <Button
                              size="small"
                              onClick={() => {
                                setEditingTag(t);
                                setTagInput(t.name);
                              }}
                            >
                              Sua
                            </Button>
                            <Button
                              size="small"
                              danger
                              loading={tagActionLoading}
                              onClick={() => handleDeleteTag(t)}
                            >
                              Xoa
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {canManageTags && (
                    <div className="border-t pt-4 mb-4">
                      <p className="text-sm font-medium mb-2">
                        {editingTag ? `Dang sua: "${editingTag.name}"` : "Tao tag moi"}
                      </p>
                      <div className="flex gap-2">
                        <Input
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          placeholder="Ten tag..."
                          onPressEnter={handleSaveTag}
                          className="flex-1"
                        />
                        <Button
                          type="primary"
                          loading={tagActionLoading}
                          onClick={handleSaveTag}
                        >
                          {editingTag ? "Cap nhat" : "Tao"}
                        </Button>
                        {editingTag && (
                          <Button onClick={() => { setEditingTag(null); setTagInput(""); }}>
                            Huy
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {canManageTags && (
                    <div className="border-t pt-4">
                      <p className="text-sm font-medium mb-2">Tao nhieu tag (phan cach bang dau phay hoac xuong dong)</p>
                      <Input.TextArea
                        rows={3}
                        value={batchInput}
                        onChange={(e) => setBatchInput(e.target.value)}
                        placeholder="chuong-1, chuong-2&#10;dinh-ly-pythagore"
                      />
                      <Button
                        className="mt-2"
                        loading={tagActionLoading}
                        onClick={handleBatchCreate}
                      >
                        Tao hang loat
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
