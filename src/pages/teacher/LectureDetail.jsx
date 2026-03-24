import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import TeacherHeader from "../../components/layout/TeacherHeader";
import TeacherSidebar from "../../components/layout/TeacherSidebar";
import {
  TrashIcon,
  PlayCircleIcon,
  DocumentTextIcon,
  CloudArrowUpIcon,
  XMarkIcon,
  PlusCircleIcon,
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
  PencilIcon,
} from "@heroicons/react/24/outline";
import { Form, Input, Button, Spin, Alert, message, Modal } from "antd";
import { getCourseById } from "../../api/course";
import { getLessonById, createLessonInChapter, updateLesson, deleteLesson } from "../../api/lesson";
import { createResource, uploadVideoResource, uploadSlideResource, getResourcesByLessonId } from "../../api/resource";
import { getResourceTypeFromFile, isVideoFile } from "../../utils/fileUtils";

export default function LectureDetail() {
  const { courseId, lectureId, chapterId } = useParams();
  const location = useLocation();
  const [course, setCourse] = useState(null);
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [form] = Form.useForm();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const navigate = useNavigate();
  const isCreateMode = !lectureId;
  const [isViewMode, setIsViewMode] = useState(location.state?.viewMode ?? false);
  const isEditMode = lectureId && !isViewMode;

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [resources, setResources] = useState([]);
  const fileInputRef = React.useRef(null);

  useEffect(() => {
    const handleResize = () => {
      setSidebarCollapsed(window.innerWidth < 1024);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const extractVideoId = (url) => {
    if (!url) return null;

    // YouTube URL patterns
    const youtubeRegex =
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/;
    const youtubeMatch = url.match(youtubeRegex);
    if (youtubeMatch) {
      return { platform: "youtube", id: youtubeMatch[1] };
    }

    // Vimeo URL pattern
    const vimeoRegex = /vimeo\.com\/(\d+)/;
    const vimeoMatch = url.match(vimeoRegex);
    if (vimeoMatch) {
      return { platform: "vimeo", id: vimeoMatch[1] };
    }

    return null;
  };

  const getVideoEmbedUrl = (videoInfo) => {
    if (!videoInfo) return null;

    if (videoInfo.platform === "youtube") {
      return `https://www.youtube.com/embed/${videoInfo.id}?controls=1&modestbranding=1`;
    } else if (videoInfo.platform === "vimeo") {
      return `https://player.vimeo.com/video/${videoInfo.id}`;
    }

    return null;
  };

  const videoInfo = extractVideoId(videoUrl);
  const videoEmbedUrl = getVideoEmbedUrl(videoInfo);

  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline", "strike"],
      [{ list: "ordered" }, { list: "bullet" }],
      [{ align: [] }],
      [{ color: [] }, { background: [] }],
      ["link", "image"],
      ["clean"],
    ],
  };

  const formats = [
    "header",
    "bold",
    "italic",
    "underline",
    "strike",
    "list",
    "bullet",
    "align",
    "color",
    "background",
    "link",
    "image",
  ];

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        // Fetch course data
        const courseResponse = await getCourseById(courseId);
        setCourse(courseResponse.data);

        // If has lectureId (editing or viewing), fetch lesson data
        if (lectureId) {
          const lessonResponse = await getLessonById(lectureId);
          const lessonData = lessonResponse.data || lessonResponse;
          setLesson(lessonData);
          
          // Set form fields with lesson data
          setTitle(lessonData.title || "");
          setContent(lessonData.content || "");
          setVideoUrl(lessonData.videoUrl || "");
          setNotes(lessonData.notes || "");
          
          // Fetch resources for this lesson
          try {
            const resourcesResponse = await getResourcesByLessonId(lectureId);
            const resourcesList = Array.isArray(resourcesResponse) 
              ? resourcesResponse 
              : resourcesResponse.data || [];
            setResources(resourcesList);
          } catch (resourceErr) {
            console.error("Failed to fetch resources:", resourceErr);
            setResources([]);
          }
          
          // Populate uploaded files if any
          if (lessonData.attachments && Array.isArray(lessonData.attachments)) {
            setUploadedFiles(lessonData.attachments.map(file => ({
              id: file.id,
              name: file.name || file.filename,
              size: file.size ? (file.size / (1024 * 1024)).toFixed(1) : "0",
              url: file.url,
            })));
          }
          
          form.setFieldsValue({
            title: lessonData.title,
            content: lessonData.content,
          });
        }
      } catch (err) {
        setError("Không thể tải dữ liệu");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [courseId, lectureId, form]);

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files || []);
    files.forEach((file) => {
      // Validate file type
      const allowedTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ];
      if (!allowedTypes.includes(file.type)) {
        message.error("Chỉ hỗ trợ file PDF và PPTX");
        return;
      }
      // Validate file size (50MB)
      if (file.size > 50 * 1024 * 1024) {
        message.error("File không được vượt quá 50MB");
        return;
      }

      const newFile = {
        id: Date.now() + Math.random(),
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(1),
        file: file, // Store actual file object for upload
        isNew: true, // Mark as new file
      };
      setUploadedFiles((prev) => [...prev, newFile]);
    });
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDeleteFile = (fileId) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const handleSubmit = async () => {
    // Prevent submission in view mode
    if (isViewMode) return;
    
    try {
      setSubmitting(true);
      
      // Prepare lesson data
      const lessonData = {
        title: title.trim(),
        content: content.trim(),
        videoUrl: videoUrl.trim(),
        notes: notes.trim(),
        chapterId: chapterId, // Assuming chapterId is passed in params
      };

      // Validate required fields
      if (!lessonData.title) {
        message.error("Vui lòng nhập tiêu đề bài giảng");
        return;
      }

      if (!lessonData.content) {
        message.error("Vui lòng nhập nội dung bài giảng");
        return;
      }

      let savedLesson;
      
      if (isEditMode) {
        // Update existing lesson
        const response = await updateLesson(lectureId, lessonData);
        savedLesson = response.data || response;
        message.success("Cập nhật bài giảng thành công");
      } else {
        // Create new lesson via chapter endpoint
        const response = await createLessonInChapter(chapterId, lessonData);
        // The response from ChapterItemController contains the lesson data inside
        savedLesson = response.data?.lesson || response.lesson || response.data || response;
        message.success("Tạo bài giảng thành công");
      }

      // Upload files if there are any new files
      const newFiles = uploadedFiles.filter(f => f.file);
      if (newFiles.length > 0 && savedLesson?.id) {
        for (const file of newFiles) {
          try {
            // Detect resource type from file
            const resourceType = getResourceTypeFromFile(file.file);
            
            // Step 1: Create resource
            const resourceResponse = await createResource(savedLesson.id, {
              title: file.name,
              url: "",
              type: resourceType
            });
            
            // Step 2: Upload the actual file
            if (resourceResponse?.id || resourceResponse?.data?.id) {
              const resourceId = resourceResponse.id || resourceResponse.data.id;
              
              if (isVideoFile(file.file)) {
                await uploadVideoResource(resourceId, file.file);
              } else {
                await uploadSlideResource(resourceId, file.file);
              }
              message.success(`Tải lên ${file.name} thành công`);
            }
          } catch (uploadErr) {
            console.error("Failed to upload file:", uploadErr);
            message.warning(`Không thể tải lên file ${file.name}`);
          }
        }
      }

      // Navigate back
      setTimeout(() => {
        navigate(`/teacher/courses/${courseId}`);
      }, 500);
    } catch (err) {
      message.error(err.message || "Không thể lưu bài giảng");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    Modal.confirm({
      title: "Xác nhận xóa bài giảng",
      content: "Bạn có chắc chắn muốn xóa bài giảng này? Hành động này không thể hoàn tác.",
      okText: "Xóa",
      cancelText: "Hủy bỏ",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          setSubmitting(true);
          await deleteLesson(lectureId);
          message.success("Xóa bài giảng thành công");
          navigate(`/teacher/courses/${courseId}`);
        } catch (err) {
          message.error(err.message || "Không thể xóa bài giảng");
          console.error(err);
        } finally {
          setSubmitting(false);
        }
      },
    });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add("bg-gray-100", "dark:bg-gray-700");
  };

  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove("bg-gray-100", "dark:bg-gray-700");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove("bg-gray-100", "dark:bg-gray-700");
    const files = Array.from(e.dataTransfer.files || []);
    const fileEvent = {
      target: {
        files: files,
      },
    };
    handleFileSelect(fileEvent);
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display text-[#111418] dark:text-white">
      <TeacherHeader />
      <div className="flex">
        <TeacherSidebar />
        <main className={`flex-1 bg-slate-50 dark:bg-slate-900 pt-16 flex flex-col h-screen ${!isViewMode && "pb-[4.5rem]"} transition-all duration-300 ${
          sidebarCollapsed ? "pl-20" : "pl-64"
        }`}>
          <div className="flex-1 overflow-y-auto p-6 md:px-12 md:py-8">
            {loading ? (
              <div className="flex justify-center items-center h-full">
                <Spin size="large" />
              </div>
            ) : error ? (
              <Alert
                message="Lỗi"
                description={error}
                type="error"
                showIcon
                className="mb-4"
              />
            ) : (
              <>
              <button
                onClick={() => navigate(`/teacher/courses/${courseId}`)}
                className="flex items-center gap-2 mb-3 text-primary hover:text-primary/80 transition-colors"
              >
                <ArrowLeftIcon className="w-5 h-5" />
                <span className="font-medium">
                  Quay lại khóa học {course?.title}
                </span>
              </button>
              <div className="mx-auto flex flex-col gap-6">
                {/* Page Header */}
                <div className="flex flex-wrap justify-between items-start gap-4">
                  <div className="flex flex-col gap-1">
                    <h1 className="text-[#111418] dark:text-white text-3xl font-black leading-tight tracking-tight">
                    {isViewMode ? "Chi tiết Bài giảng" : isEditMode ? "Chỉnh sửa Bài giảng" : "Tạo Bài giảng mới"}
                  </h1>
                  <p className="text-[#617589] dark:text-gray-400 text-base font-normal">
                    {isViewMode ? "Xem nội dung bài giảng" : "Chỉnh sửa nội dung, media và bài tập cho bài giảng này."}
                  </p>
                </div>
                {(isEditMode || isViewMode) && (
                  <div className="flex items-center gap-3">
                    {isViewMode && (
                      <Button
                        type="primary"
                        onClick={() => setIsViewMode(false)}
                        className="px-6 py-2.5 h-10 rounded-lg font-bold flex items-center gap-2"
                        icon={<PencilIcon className="h-4 w-4" />}
                      >
                        Chỉnh sửa
                      </Button>
                    )}
                    {/* <button 
                      onClick={handleDelete}
                      disabled={submitting}
                      className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm font-semibold disabled:opacity-50"
                    >
                      <TrashIcon className="h-[18px] w-[18px]" />
                      Xóa bài giảng
                    </button> */}
                  </div>
                )}
              </div>

              {/* Main Form Grid */}
              <Form layout="vertical" className="grid grid-cols-1 gap-6" form={form}>
                <div className="space-y-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-[#111418] dark:text-gray-200 text-base font-medium">
                      Thuộc khóa học
                    </label>
                    <div className="px-4 py-3 rounded-lg bg-primary bg-gray-50 dark:bg-gray-700 border border-[#dbe0e6] dark:border-gray-600">
                      <p className="text-white font-medium">
                        {course?.title}
                      </p>
                    </div>
                  </div>

                  {/* Title Input */}
                  <Form.Item
                    label={
                      <span className="text-[#111418] dark:text-gray-200 text-base font-medium">
                        Tiêu đề bài giảng
                      </span>
                    }
                    name="title"
                    rules={[
                      {
                        required: true,
                        message: "Vui lòng nhập tiêu đề bài giảng",
                      },
                      {
                        min: 3,
                        message: "Tiêu đề bài giảng phải có ít nhất 3 ký tự",
                      },
                    ]}
                  >
                    <Input
                      placeholder="Nhập tiêu đề bài giảng..."
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      disabled={isViewMode}
                      className={`h-12 rounded-lg ${isViewMode ? 'disabled:bg-white dark:disabled:bg-gray-800 disabled:text-[#111418] dark:disabled:text-white' : ''}`}
                    />
                  </Form.Item>

                  {/* Rich Text Editor */}
                  <Form.Item
                    label={
                      <span className="text-[#111418] dark:text-gray-200 text-base font-medium">
                        Nội dung
                      </span>
                    }
                    name="content"
                    rules={[
                      {
                        required: true,
                        message: "Vui lòng nhập nội dung bài giảng",
                      },
                      {
                        min: 3,
                        message: "Nội dung bài giảng phải có ít nhất 3 ký tự",
                      },
                    ]}
                  >
                    <ReactQuill
                      theme="snow"
                      value={content}
                      onChange={setContent}
                      modules={modules}
                      formats={formats}
                      className="h-[400px] mb-12 [&_.ql-container]:bg-white [&_.ql-container]:dark:bg-gray-800"
                      readOnly={isViewMode}
                    />
                  </Form.Item>

                  {/* Media Attachments Two Columns */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Video Section */}
                    <div className="bg-white dark:bg-card-dark p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col gap-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400">
                          <PlayCircleIcon className="h-6 w-6" />
                        </div>
                        <h3 className="font-bold text-lg dark:text-white">
                          Video bài giảng
                        </h3>
                      </div>
                      <Form.Item
                        label="Link Video"
                        labelCol={{
                          className: "text-sm font-medium dark:text-gray-300",
                        }}
                        className="mb-2"
                      >
                        <div className="flex gap-2">
                          <Input
                            placeholder="Dán link YouTube/Video..."
                            size="large"
                            value={videoUrl}
                            onChange={(e) => setVideoUrl(e.target.value)}
                            disabled={isViewMode}
                            className={`flex-1 bg-[#f8f9fa] dark:bg-gray-800 border-[#dbe0e6] dark:border-gray-600 ${isViewMode ? 'disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:text-[#111418] dark:disabled:text-white' : ''}`}
                          />
                          {videoUrl && (
                            <Button
                              onClick={() => setVideoUrl("")}
                              className="px-4 h-11 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/30 rounded-lg font-medium text-sm hover:bg-red-100 dark:hover:bg-red-900/40"
                            >
                              Xóa
                            </Button>
                          )}
                        </div>
                      </Form.Item>
                      {/* Video Preview */}
                      {videoEmbedUrl ? (
                        <div className="relative w-full aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                          <iframe
                            width="100%"
                            height="100%"
                            src={videoEmbedUrl}
                            title="Video Preview"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="absolute inset-0"
                          ></iframe>
                        </div>
                      ) : (
                        <div className="relative w-full aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center group cursor-pointer border border-dashed border-gray-300 dark:border-gray-600">
                          <div className="relative z-10 bg-white/90 dark:bg-black/70 p-3 rounded-full shadow-lg group-hover:scale-110 transition-transform">
                            <PlayCircleIcon className="h-8 w-8 text-primary" />
                          </div>
                          <div className="absolute bottom-3 left-3 z-10 bg-black/70 px-2 py-1 rounded text-xs text-white">
                            Preview Mode
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Document/Slides Section */}
                    <div className="bg-white dark:bg-card-dark p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col gap-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                          <DocumentTextIcon className="h-6 w-6" />
                        </div>
                        <h3 className="font-bold text-lg dark:text-white">
                          Tài liệu / Slide
                        </h3>
                      </div>
                      {/* Drag Drop Zone */}
                      <div
                        onDragOver={isViewMode ? undefined : handleDragOver}
                        onDragLeave={isViewMode ? undefined : handleDragLeave}
                        onDrop={isViewMode ? undefined : handleDrop}
                        onClick={() => !isViewMode && fileInputRef.current?.click()}
                        className={`flex-1 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex flex-col items-center justify-center p-6 bg-[#f8f9fa] dark:bg-gray-800/50 transition-colors min-h-[200px] ${
                          !isViewMode && "hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                        } ${isViewMode && "opacity-60 bg-gray-50 dark:bg-gray-800"}`}
                      >
                        <CloudArrowUpIcon className="h-12 w-12 text-gray-400 mb-3" />
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center">
                          Kéo thả file PDF vào đây hoặc{" "}
                          <span className="text-primary hover:underline">
                            tải lên
                          </span>
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          Hỗ trợ: PDF, PPTX (Max 50MB)
                        </p>
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept=".pdf,.pptx"
                          onChange={handleFileSelect}
                          className="!hidden"
                        />
                      </div>
                      {/* File List Items */}
                      {uploadedFiles.length > 0 && (
                        <div className="space-y-2">
                          {uploadedFiles.map((file) => (
                            <div
                              key={file.id}
                              className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-sm"
                            >
                              <div className="flex items-center gap-3 overflow-hidden">
                                <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded text-red-600 dark:text-red-400 shrink-0">
                                  <DocumentTextIcon className="h-5 w-5" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                    {file.name}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {file.size} MB
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleDeleteFile(file.id)}
                                className="text-gray-400 hover:text-red-500 transition-colors"
                              >
                                <XMarkIcon className="h-5 w-5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Resources List Section */}
                      {resources.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                          <h3 className="text-sm font-semibold text-[#111418] dark:text-white mb-3">
                            Tài nguyên đã tải lên
                          </h3>
                          <div className="space-y-2">
                            {resources.map((resource) => (
                              <div
                                key={resource.id}
                                className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
                              >
                                <div className="flex items-center gap-3 overflow-hidden">
                                  <div className="bg-green-100 dark:bg-green-900/50 p-2 rounded text-green-600 dark:text-green-400 shrink-0">
                                    {resource.type === "VIDEO" ? (
                                      <PlayCircleIcon className="h-5 w-5" />
                                    ) : (
                                      <DocumentTextIcon className="h-5 w-5" />
                                    )}
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                      {resource.title}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {resource.type || "File"}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quiz Management Section */}
                  {/* <div className="bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 p-6 rounded-xl border border-primary/20 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="flex items-start gap-4">
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-full shadow-sm shrink-0 text-primary">
                        <ClipboardDocumentListIcon className="h-7 w-7" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <h3 className="text-lg font-bold text-[#111418] dark:text-white">
                          Bài tập &amp; Quiz
                        </h3>
                        <p className="text-sm text-[#617589] dark:text-gray-300 max-w-lg">
                          Tạo bộ câu hỏi trắc nghiệm hoặc bài tập tự luận cho
                          bài giảng này để đánh giá học viên.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        navigate(`/teacher/courses/${courseId}/quizzes/create`)
                      }
                      className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-gray-800 text-primary border border-primary/30 rounded-lg font-bold hover:bg-primary hover:text-white transition-all shadow-sm"
                    >
                      <PlusCircleIcon className="h-5 w-5" />
                      Tạo Quiz mới
                    </button>
                  </div> */}

                  {/* Notes Section */}
                  <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30 p-6 rounded-xl">
                    <label className="flex items-center gap-2 text-yellow-800 dark:text-yellow-500 text-sm font-bold mb-2">
                      <DocumentTextIcon className="h-[18px] w-[18px]" />
                      Ghi chú giảng viên (Chỉ hiển thị cho bạn)
                    </label>
                    <textarea
                      disabled={isViewMode}
                      className={`w-full bg-white dark:bg-gray-800 border border-yellow-200 dark:border-yellow-900/30 rounded-lg p-3 text-sm text-[#111418] dark:text-white focus:ring-1 focus:ring-yellow-500 focus:outline-none min-h-[80px] ${isViewMode ? 'disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:text-[#111418] dark:disabled:text-white' : ''}`}
                      placeholder="Nhập ghi chú cá nhân về bài giảng này..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    ></textarea>
                  </div>
                </div>
              </Form>
            </div>
            </>
            )}
            {/* Sticky Footer Action Bar */}
            {!isViewMode && (
            <div className={`fixed bottom-0 left-0 right-0 lg:ml-64 border-t border-[#e5e7eb] dark:border-gray-800 bg-white dark:bg-card-dark p-4 px-6 md:px-12 flex justify-between items-center z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] ${isViewMode ? 'hidden' : ''}`}>
              <div className="hidden sm:flex flex-col">
                    <span className="text-xs text-gray-500">
                      Lần lưu cuối: {lesson?.updatedAt ? new Date(lesson.updatedAt).toLocaleTimeString('vi-VN') : 'Chưa lưu'}
                    </span>
                    <span className="text-xs font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
                      <CheckCircleIcon className="h-3 w-3" /> Đã đồng bộ
                    </span>
              </div>
              <div className="flex gap-3 w-full sm:w-auto justify-end">
                <button
                  onClick={() => isViewMode ? navigate(-1) : setIsViewMode(true)}
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-[#111418] dark:text-white font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm disabled:opacity-50"
                >
                  Hủy
                </button>
                <button 
                  onClick={handleSubmit}
                  disabled={submitting || isViewMode}
                  className="px-6 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white font-bold transition-all shadow-md shadow-primary/20 flex items-center gap-2 text-sm disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Spin size="small" style={{ color: "white" }} />
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="h-5 w-5" />
                      Lưu bài giảng
                    </>
                  )}
                </button>
              </div>
            </div>)}
          </div>
        </main>
      </div>
    </div>
  );
}
