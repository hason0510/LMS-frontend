import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Spin, Alert, Table, Button, Tag, Breadcrumb } from "antd";
import { PlusCircleIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";
import TeacherHeader from "../../components/layout/TeacherHeader";
import TeacherSidebar from "../../components/layout/TeacherSidebar";
import AdminSidebar from "../../components/layout/AdminSidebar";
import { getQuestionBankById, deleteQuestion, createQuestion, updateQuestion } from "../../api/questionBank";
import { useAuth } from "../../contexts/AuthContext";
import QuestionModal from "../../components/teacher/QuestionModal";

export default function QuestionBankDetail({ isAdmin = false }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userRole = user?.role.toLowerCase();
  
  const [bank, setBank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);

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
      setBank(res.data || res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (questionId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa câu hỏi này?")) return;
    try {
      await deleteQuestion(questionId);
      fetchBank();
    } catch (err) {
      alert("Lỗi khi xóa câu hỏi");
    }
  };
  const handleSaveQuestion = async (values) => {
    try {
      setSaveLoading(true);
      if (editingQuestion) {
        await updateQuestion(editingQuestion.id, values);
        message.success("Cập nhật câu hỏi thành công");
      } else {
        await createQuestion(id, values);
        message.success("Thêm câu hỏi thành công");
      }
      setModalVisible(false);
      setEditingQuestion(null);
      fetchBank();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || "Lỗi khi lưu câu hỏi");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleEdit = (record) => {
    setEditingQuestion(record);
    setModalVisible(true);
  };

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
    },
    {
      title: "Nội dung câu hỏi",
      dataIndex: "content",
      key: "content",
      render: (text) => <div className="line-clamp-2 max-w-md" dangerouslySetInnerHTML={{__html: text}} />
    },
    {
      title: "Loại",
      dataIndex: "type",
      key: "type",
      render: (type) => <Tag color="blue">{type}</Tag>
    },
    {
      title: "Độ khó",
      dataIndex: "difficultyLevel",
      key: "difficultyLevel",
      render: (diff) => {
        const color = diff === "EASY" ? "green" : diff === "MEDIUM" ? "orange" : "red";
        return <Tag color={color}>{diff}</Tag>;
      }
    },
    {
      title: "Hành động",
      key: "action",
      render: (_, record) => (
        <div className="flex gap-2">
          <Button size="small" onClick={() => handleEdit(record)}>Sửa</Button>
          <Button size="small" danger onClick={() => handleDelete(record.id)}>Xóa</Button>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-[#111418] dark:text-white">
      <TeacherHeader />
      <div className="flex">
        {isAdmin ? <AdminSidebar /> : <TeacherSidebar />}
        <main className={`flex-1 pt-16 bg-slate-50 dark:bg-slate-900 transition-all duration-300 ${sidebarCollapsed ? "pl-20" : "pl-64"}`}>
          <div className="px-6 py-8 mx-auto max-w-5xl">
            <div className="mb-4">
              <Button type="link" icon={<ArrowLeftIcon className="w-4 h-4"/>} onClick={() => navigate(-1)} className="p-0">Quay lại</Button>
            </div>
            
            {loading ? (
              <div className="flex justify-center p-10"><Spin size="large" /></div>
            ) : error ? (
              <Alert type="error" title="Lỗi" description={error} />
            ) : bank ? (
              <>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h1 className="text-2xl font-bold">{bank.name}</h1>
                    <p className="text-gray-500">{bank.description}</p>
                  </div>
                  <Button 
                    type="primary" 
                    icon={<PlusCircleIcon className="w-5 h-5"/>} 
                    className="flex items-center gap-2"
                    onClick={() => {
                      setEditingQuestion(null);
                      setModalVisible(true);
                    }}
                  >
                    Thêm câu hỏi
                  </Button>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <Table 
                    dataSource={bank.questions || []} 
                    columns={columns} 
                    rowKey="id"
                    pagination={{ pageSize: 15 }}
                  />
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
