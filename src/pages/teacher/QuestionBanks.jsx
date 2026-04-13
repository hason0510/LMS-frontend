import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Modal, Form, Input, Select, Button, message, Table, Tag } from "antd";
import TeacherHeader from "../../components/layout/TeacherHeader";
import TeacherSidebar from "../../components/layout/TeacherSidebar";
import AdminSidebar from "../../components/layout/AdminSidebar";
import { useAuth } from "../../contexts/AuthContext";
import { getQuestionBanks, createQuestionBank } from "../../api/questionBank";
import { getAllCategories } from "../../api/category";
import { getSubjectsByCategory } from "../../api/subject";
import { PlusCircleIcon } from "@heroicons/react/24/outline";

const { TextArea } = Input;

export default function QuestionBanks({ isAdmin = false }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const userRole = user?.role.toLowerCase();
  
  const [banks, setBanks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const handleResize = () => setSidebarCollapsed(window.innerWidth < 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [banksRes, catRes] = await Promise.all([
        getQuestionBanks({}),
        getAllCategories(1, 100)
      ]);
      setBanks(banksRes.data || banksRes);
      setCategories(catRes.data?.pageList.map(cat => ({ value: cat.id, label: cat.title })) || []);
    } catch (err) {
      console.error(err);
      message.error("Lỗi khi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = async (value) => {
    form.setFieldsValue({ subjectId: undefined });
    if (value) {
      try {
        setSubjectsLoading(true);
        const res = await getSubjectsByCategory(value);
        const subjectList = res.data || [];
        setSubjects(subjectList.map(sub => ({ value: sub.id, label: sub.title })));
      } catch (err) {
        console.error(err);
      } finally {
        setSubjectsLoading(false);
      }
    } else {
      setSubjects([]);
    }
  };

  const handleCreate = async (values) => {
    try {
      const payload = {
        name: values.name,
        description: values.description,
        scopeType: "SUBJECT_WIDE",
        subjectId: values.subjectId
      };
      await createQuestionBank(payload);
      message.success("Tạo Ngân hàng câu hỏi thành công");
      setIsModalOpen(false);
      form.resetFields();
      fetchData();
    } catch (err) {
      message.error("Lỗi khi tạo Ngân hàng câu hỏi");
    }
  };

  const columns = [
    {
      title: "Tên",
      dataIndex: "name",
      key: "name",
      render: (text, record) => (
        <Link to={`/${userRole}/question-banks/${record.id}`} className="text-primary hover:underline font-medium">
          {text}
        </Link>
      )
    },
    {
      title: "Mô tả",
      dataIndex: "description",
      key: "description",
    },
    {
      title: "Phạm vi",
      dataIndex: "scopeType",
      key: "scopeType",
      render: (type) => <Tag color="blue">{type}</Tag>
    },
    {
      title: "Hành động",
      key: "action",
      render: (_, record) => (
        <Link to={`/${userRole}/question-banks/${record.id}`} className="text-primary hover:underline">
          Chi tiết
        </Link>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display text-[#111418] dark:text-white">
      <TeacherHeader />
      <div className="flex">
        {isAdmin ? <AdminSidebar /> : <TeacherSidebar />}
        <main className={`flex-1 pt-16 bg-slate-50 dark:bg-slate-900 transition-all duration-300 ${sidebarCollapsed ? "pl-20" : "pl-64"}`}>
          <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">Ngân hàng câu hỏi</h1>
                <p className="text-slate-600 dark:text-slate-400">Quản lý kho câu hỏi dùng cho bài Quizz/Assignment.</p>
              </div>
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg font-bold"
              >
                <PlusCircleIcon className="h-5 w-5" />
                Tạo mới
              </button>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
              <Table 
                columns={columns} 
                dataSource={banks} 
                rowKey="id" 
                loading={loading}
                pagination={{ pageSize: 10 }}
              />
            </div>
          </div>
        </main>
      </div>

      <Modal
        title="Tạo Ngân hàng câu hỏi mới"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item label="Tên ngân hàng" name="name" rules={[{ required: true, message: "Bắt buộc nhập" }]}>
            <Input placeholder="Ví dụ: Ngân hàng câu hỏi Java" />
          </Form.Item>
          <Form.Item label="Danh mục (Category)" name="categoryId" rules={[{ required: true, message: "Bắt buộc chọn" }]}>
            <Select options={categories} placeholder="Chọn danh mục" onChange={handleCategoryChange} showSearch optionFilterProp="label" />
          </Form.Item>
          <Form.Item label="Môn học (Subject)" name="subjectId" rules={[{ required: true, message: "Bắt buộc chọn" }]}>
            <Select 
              options={subjects} 
              placeholder={form.getFieldValue("categoryId") ? "Chọn môn học" : "Vui lòng chọn danh mục trước"} 
              loading={subjectsLoading}
              disabled={!form.getFieldValue("categoryId")}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item label="Mô tả" name="description">
            <TextArea rows={4} placeholder="Mô tả" />
          </Form.Item>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setIsModalOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit">Tạo</Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
