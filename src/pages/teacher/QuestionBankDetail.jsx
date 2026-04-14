import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Button, message, Modal, Spin, Table, Tag } from "antd";
import { ArrowLeftIcon, PlusCircleIcon } from "@heroicons/react/24/outline";
import TeacherHeader from "../../components/layout/TeacherHeader";
import TeacherSidebar from "../../components/layout/TeacherSidebar";
import AdminSidebar from "../../components/layout/AdminSidebar";
import {
  createQuestion,
  deleteQuestion,
  getQuestionBankById,
  importGiftQuestions,
  updateQuestion,
} from "../../api/questionBank";
import QuestionModal from "../../components/teacher/QuestionModal";

export default function QuestionBankDetail({ isAdmin = false }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [bank, setBank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const giftFileInputRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setSidebarCollapsed(window.innerWidth < 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    fetchBank();
  }, [id]);

  const fetchBank = async () => {
    try {
      setLoading(true);
      const res = await getQuestionBankById(id);
      setBank(res?.data || res);
      setError(null);
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (questionId) => {
    if (!window.confirm("Ban co chac chan muon xoa cau hoi nay?")) {
      return;
    }
    try {
      await deleteQuestion(questionId);
      message.success("Da xoa cau hoi");
      await fetchBank();
    } catch (err) {
      message.error(err?.response?.data?.message || "Loi khi xoa cau hoi");
    }
  };

  const handleSaveQuestion = async (values) => {
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

  const handleEdit = (record) => {
    setEditingQuestion(record);
    setModalVisible(true);
  };

  const handlePickGiftFile = () => {
    giftFileInputRef.current?.click();
  };

  const handleGiftFileSelected = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

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
      title: "Hanh dong",
      key: "action",
      render: (_, record) => (
        <div className="flex gap-2">
          <Button size="small" onClick={() => handleEdit(record)}>
            Sua
          </Button>
          <Button size="small" danger onClick={() => handleDelete(record.id)}>
            Xoa
          </Button>
        </div>
      ),
    },
  ];

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
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      ref={giftFileInputRef}
                      type="file"
                      accept=".txt,text/plain"
                      className="hidden"
                      onChange={handleGiftFileSelected}
                    />
                    <Button onClick={handlePickGiftFile} loading={importLoading}>
                      Import GIFT/AIKEN (.txt)
                    </Button>
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
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <Table dataSource={bank.questions || []} columns={columns} rowKey="id" pagination={{ pageSize: 15 }} />
                </div>

                <QuestionModal
                  visible={modalVisible}
                  onCancel={() => {
                    setModalVisible(false);
                    setEditingQuestion(null);
                  }}
                  onFinish={handleSaveQuestion}
                  initialValues={editingQuestion}
                  loading={saveLoading}
                />
              </>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}
