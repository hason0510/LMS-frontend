import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Form, Input, Select, Spin, Alert, Upload, message, Modal } from "antd";
import { useAuth } from "../../contexts/AuthContext";
import {
  PhotoIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import TeacherHeader from "../../components/layout/TeacherHeader";
import TeacherSidebar from "../../components/layout/TeacherSidebar";
import {
  createCourse,
  uploadCourseImage,
  getCourseById,
  updateCourse,
  deleteCourse,
} from "../../api/course";
import { getAllCategories } from "../../api/category";
import { LoadingOutlined } from "@ant-design/icons";

const { TextArea } = Input;
const whiteSpinner = (
  <LoadingOutlined style={{ fontSize: 16, color: "#fff" }} spin />
);

export default function CreateCourse({ isAdmin = false }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userRole = user?.role.toLowerCase();
  const isExistingCourse = !!id;

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [isCreateMode, setIsCreateMode] = useState(!id);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [newCourseId, setNewCourseId] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setSidebarCollapsed(window.innerWidth < 1024);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  /* ------------------ FETCH CATEGORIES ------------------ */
  useEffect(() => {
    fetchCategories();
  }, []);

  console.log("is create mode:", isCreateMode);

  const fetchCategories = async () => {
    try {
      const res = await getAllCategories(1, 100);
      setCategories(
        res.data.pageList.map((cat) => ({
          value: cat.id,
          label: cat.title,
        }))
      );
    } catch (err) {
      console.error(err);
    }
  };

  /* ------------------ LOAD COURSE ------------------ */
  useEffect(() => {
    if (isExistingCourse) {
      const fetchCourse = async () => {
        try {
          setLoading(true);
          const response = await getCourseById(id);
          const data = response.data;
          form.setFieldsValue({
            title: data.title,
            description: data.description,
            categoryId: data.categoryId,
            image: data.imageUrl,
          });
        } catch (err) {
          console.error(err);
          message.error("Không thể tải thông tin khóa học");
        } finally {
          setLoading(false);
        }
      };
      fetchCourse();
    }
  }, [isExistingCourse, id, form]);

  /* ------------------ SUBMIT ------------------ */
  const onFinish = async (values) => {
    setLoading(true);
    setError(null);

    try {
      let courseId = id;

      // Step 1: Create or update course (WITHOUT image)
      if (isExistingCourse) {
        await updateCourse(id, {
          title: values.title,
          description: values.description,
          categoryId: values.categoryId,
        });
        message.success("Cập nhật khóa học thành công");
        
        setNewCourseId(courseId);
        setShowImageModal(true);
      } else {
        // For new courses, send all data except image
        const courseResponse = await createCourse({
          title: values.title,
          description: values.description,
          categoryId: values.categoryId,
        });
        // Get course ID from response
        courseId = courseResponse.data?.id || courseResponse.id;
        message.success("Tạo khóa học thành công");

        // Step 2: Show modal to upload image for new course
        setNewCourseId(courseId);
        setShowImageModal(true);
      }
    } catch (err) {
      setError(err.message || "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  /* ------------------ IMAGE UPLOAD ------------------ */
  const beforeUpload = (file) => {
    setImageFile(file);
    return false; // chặn upload tự động
  };

  /* ------------------ HANDLE IMAGE MODAL SAVE ------------------ */
  const handleImageModalSave = async () => {
    if (imageFile && newCourseId) {
      setUploadingImage(true);
      try {
        await uploadCourseImage(newCourseId, imageFile);
        message.success("Tải ảnh khóa học thành công");
        setShowImageModal(false);
        setImageFile(null);
        navigate(`/${userRole}/courses`);
      } catch (err) {
        message.error(err.message || "Lỗi khi tải ảnh");
      } finally {
        setUploadingImage(false);
      }
    }
  };

  /* ------------------ HANDLE IMAGE MODAL SKIP ------------------ */
  const handleImageModalSkip = () => {
    setShowImageModal(false);
    setImageFile(null);
    navigate(`/${userRole}/courses`);
  };

  /* ------------------ HANDLE DELETE COURSE ------------------ */
  const handleDeleteCourse = async () => {
    try {
      setDeleting(true);
      await deleteCourse(id);
      message.success("Khóa học đã được xóa thành công");
      navigate(`/${userRole}/courses`);
    } catch (err) {
      message.error(err.message || "Lỗi khi xóa khóa học");
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      <TeacherHeader />

      <div className="flex">
        <TeacherSidebar />

        <main className={`flex-1 pt-16 bg-slate-50 dark:bg-slate-900 transition-all duration-300 ${
          sidebarCollapsed ? "pl-20" : "pl-64"
        }`}>
          <div className="max-w-7xl mx-auto px-6 py-8">
            <header className="mb-8 flex justify-between items-center">
              <h1 className="text-3xl font-bold">
                {isExistingCourse ? "Chi tiết khóa học" : "Tạo khóa học mới"}
              </h1>

              {isExistingCourse && !isCreateMode && !isEditMode && (
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsEditMode(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg"
                  >
                    <PencilSquareIcon className="w-5 h-5" />
                    Chỉnh sửa
                  </button>
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    <TrashIcon className="w-5 h-5" />
                    Xóa
                  </button>
                </div>
              )}
            </header>

            {error && (
              <Alert
                type="error"
                message="Lỗi"
                description={error}
                showIcon
                className="mb-6"
              />
            )}

            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm">
              <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
                disabled={!isEditMode && !isCreateMode}
                validateTrigger="onBlur"
                className={!isEditMode && !isCreateMode ? "disabled-form" : ""}
              >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* LEFT */}
                  <div className="lg:col-span-2 space-y-6">
                    <Form.Item
                      label="Tiêu đề khóa học"
                      name="title"
                      rules={[
                        {
                          required: true,
                          message: "Vui lòng nhập tiêu đề khóa học",
                        },
                      ]}
                    >
                      <Input
                        placeholder="Nhập tiêu đề khóa học"
                        className="h-[40px]"
                      />
                    </Form.Item>

                    <Form.Item
                      label="Mô tả khóa học"
                      name="description"
                      rules={[
                        {
                          required: true,
                          message: "Vui lòng nhập mô tả khóa học",
                        },
                      ]}
                    >
                      <TextArea rows={6} placeholder="Nhập mô tả chi tiết..." />
                    </Form.Item>
                  </div>

                  {/* RIGHT */}
                  <div className="space-y-6">
                    <Form.Item
                      label="Lĩnh vực"
                      name="categoryId"
                      rules={[
                        { required: true, message: "Vui lòng chọn lĩnh vực" },
                      ]}
                    >
                      <Select
                        placeholder="Chọn lĩnh vực"
                        options={categories}
                        className="h-[40px]"
                      />
                    </Form.Item>
                  </div>
                </div>

                {(isCreateMode || isEditMode) && (
                  <div className="flex justify-end gap-4 mt-8 pt-6 border-t">
                    <button
                      type="button"
                      // onClick={() => setIsEditMode(false)}
                      onClick={() => {
                        if(!isCreateMode) setIsEditMode(false);
                        else navigate(`/${userRole}/courses`);
                      }}
                      className="px-6 py-2 rounded-lg bg-slate-100"
                    >
                      Hủy
                    </button>

                    <button
                      type="submit"
                      className="px-6 py-2 rounded-lg bg-primary text-white"
                      disabled={loading}
                    >
                      {loading ? <Spin size="small" /> : isCreateMode ? "Tạo khóa học" : "Cập nhật khóa học"}
                    </button>
                  </div>
                )}
              </Form>
            </div>
          </div>
        </main>
      </div>

      {/* IMAGE UPLOAD MODAL */}
      <Modal
        title="Tải ảnh đại diện khóa học"
        open={showImageModal}
        onCancel={handleImageModalSkip}
        footer={null}
        centered
      >
        <div className="space-y-6">
          <Upload
            beforeUpload={beforeUpload}
            showUploadList={false}
            accept="image/*"
          >
            <div className="h-64 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:bg-slate-100">
              {imageFile ? (
                <img
                  src={URL.createObjectURL(imageFile)}
                  alt="preview"
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <div className="text-center w-full text-slate-500">
                  <PhotoIcon className="w-10 h-10 mx-auto mb-2" />
                  Nhấn để tải ảnh
                </div>
              )}
            </div>
          </Upload>

          <div className="flex justify-end gap-4">
            <button
              onClick={handleImageModalSkip}
              className="px-6 py-2 rounded-lg bg-slate-100 text-slate-700"
              disabled={uploadingImage}
            >
              Bỏ qua
            </button>
            <button
              onClick={handleImageModalSave}
              className="px-6 py-2 rounded-lg bg-primary text-white flex items-center gap-2"
              disabled={!imageFile || uploadingImage}
            >
              {uploadingImage ? <Spin indicator={whiteSpinner} /> : "Lưu"}
            </button>
          </div>
        </div>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        title="Xác nhận xóa khóa học"
        open={showDeleteModal}
        onCancel={() => setShowDeleteModal(false)}
        footer={null}
        centered
      >
        <p className="mb-6">
          Bạn có chắc chắn muốn xóa khóa học này? Hành động này không thể hoàn
          tác.
        </p>
        <div className="flex justify-end gap-4">
          <button
            onClick={() => setShowDeleteModal(false)}
            className="px-6 py-2 rounded-lg bg-slate-100 text-slate-700"
            disabled={deleting}
          >
            Hủy
          </button>
          <button
            onClick={handleDeleteCourse}
            className="px-6 py-2 rounded-lg bg-red-600 text-white flex items-center gap-2"
            disabled={deleting}
          >
            {deleting ? <Spin indicator={whiteSpinner} /> : "Xóa"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
