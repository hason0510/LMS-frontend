import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import TeacherHeader from "../../components/layout/TeacherHeader";
import TeacherSidebar from "../../components/layout/TeacherSidebar";
import AdminSidebar from "../../components/layout/AdminSidebar";
import AppBreadcrumb from "../../components/common/AppBreadcrumb";
import UserIdentity from "../../components/common/UserIdentity";
import {
  TrashIcon,
  PlayCircleIcon,
  DocumentTextIcon,
  CloudArrowUpIcon,
  XMarkIcon,
  PlusCircleIcon,
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  PencilIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import { Form, Input, Button, Spin, Alert, Modal, App, Segmented, Empty } from "antd";
import { getCourseById, createClassContentItem, getClassChapters, getClassContentItems, getClassContentCompletion } from "../../api/classSection";
import { getLessonById, updateLesson, deleteLesson, createLesson } from "../../api/lesson";
import {
  attachResourceToLesson,
  createResource,
  createStandaloneResource,
  uploadAttachmentResource,
  uploadVideoResource,
  uploadSlideResource,
  getResourceById,
  getResourcesByLessonId,
  detachResourceFromLesson,
} from "../../api/resource";
import { getResourceTypeFromFile, isVideoFile } from "../../utils/fileUtils";
import FileItem from "../../components/common/FileItem";
import ResourceLibrarySelectModal from "../../components/media/ResourceLibrarySelectModal";
import MediaAttachButton from "../../components/media/MediaAttachButton";
import ResourceRenderer from "../../components/media/ResourceRenderer";
import {
  createContentItemTemplate,
  getTemplateById,
  createLessonTemplate,
  getLessonTemplateById,
  updateLessonTemplate,
} from "../../api/curriculumTemplate";
import { buildQuillModules, createQuillTableControl, extendQuillFormats } from "../../utils/quillTable";

export default function LectureDetail({ isAdmin = false }) {
  const { t, i18n } = useTranslation();
  const { classSectionId, lectureId, chapterId } = useParams();
  const location = useLocation();
  const [course, setCourse] = useState(null);
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const { message: messageApi, modal: modalApi } = App.useApp();
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
  const [pendingLibraryResources, setPendingLibraryResources] = useState([]);
  const [libraryPickerOpen, setLibraryPickerOpen] = useState(false);
  const [fileUploadProgress, setFileUploadProgress] = useState({}); // { fileId: 0-100 }
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef(null);

  const [lessonCompletionModalOpen, setLessonCompletionModalOpen] = useState(false);
  const [lessonCompletionLoading, setLessonCompletionLoading] = useState(false);
  const [lessonCompletionRows, setLessonCompletionRows] = useState([]);
  const [lessonCompletionFilter, setLessonCompletionFilter] = useState("ALL");
  const [lessonCompletionKeyword, setLessonCompletionKeyword] = useState("");

  // Video upload state
  const [videoSourceType, setVideoSourceType] = useState("embed"); // "embed" | "upload"
  const [videoResource, setVideoResource] = useState(null);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [isVideoUploading, setIsVideoUploading] = useState(false);
  const videoFileInputRef = React.useRef(null);
  const [pendingVideoFile, setPendingVideoFile] = useState(null); // for create mode

  // Template Mode Detection
  const isTemplateMode = location.state?.isTemplateMode || false;
  const chapterIdFromState = location.state?.chapterId || chapterId;
  const templateIdFromPath = useParams().templateId;
  const classResourceScope = !isTemplateMode && classSectionId
    ? { scopeType: "CLASS_SECTION", scopeId: Number(classSectionId) }
    : {};
  const templateResourceScope = isTemplateMode && templateIdFromPath
    ? { scopeType: "CURRICULUM_TEMPLATE", scopeId: Number(templateIdFromPath) }
    : {};
  const activeMediaScope = isTemplateMode ? templateResourceScope : classResourceScope;

  const closeLessonCompletionModal = () => {
    setLessonCompletionModalOpen(false);
    setLessonCompletionRows([]);
    setLessonCompletionFilter("ALL");
    setLessonCompletionKeyword("");
  };

  const resolveLessonClassContentItemId = async () => {
    if (location.state?.classContentItemId) {
      return location.state.classContentItemId;
    }

    if (!classSectionId || !lectureId) {
      return null;
    }

    const chaptersResponse = await getClassChapters(classSectionId);
    const chapters = Array.isArray(chaptersResponse) ? chaptersResponse : chaptersResponse?.data || [];

    for (const chapter of chapters) {
      const itemsResponse = await getClassContentItems(classSectionId, chapter.id);
      const items = Array.isArray(itemsResponse) ? itemsResponse : itemsResponse?.data || [];
      const matchedItem = items.find((item) => {
        const lessonKey = Number(item.lessonId || item.id);
        return item.itemType === "LESSON" && lessonKey === Number(lectureId);
      });
      if (matchedItem) {
        return matchedItem.id;
      }
    }

    return null;
  };

  const handleOpenLessonCompletion = async () => {
    try {
      setLessonCompletionModalOpen(true);
      setLessonCompletionLoading(true);
      setLessonCompletionFilter("ALL");
      setLessonCompletionKeyword("");

      const classContentItemId = await resolveLessonClassContentItemId();
      if (!classContentItemId) {
        throw new Error(t("classContent.lessonCompletion.messages.cannotResolveItem"));
      }

      const response = await getClassContentCompletion(classSectionId, classContentItemId);
      setLessonCompletionRows(Array.isArray(response) ? response : []);
    } catch (err) {
      messageApi.error(err?.response?.data?.message || err.message || t("classContent.lessonCompletion.messages.loadFailed"));
      setLessonCompletionRows([]);
      setLessonCompletionModalOpen(false);
    } finally {
      setLessonCompletionLoading(false);
    }
  };

  const canOpenLessonCompletion = !isAdmin && !isTemplateMode && classSectionId && lectureId;

  const lessonCompletionCounts = lessonCompletionRows.reduce(
    (acc, row) => {
      if (row.completed) {
        acc.completed += 1;
      } else {
        acc.notCompleted += 1;
      }
      return acc;
    },
    { completed: 0, notCompleted: 0 }
  );

  const filteredLessonCompletionRows = lessonCompletionRows.filter((row) => {
    const matchesStatus =
      lessonCompletionFilter === "ALL" ||
      (lessonCompletionFilter === "COMPLETED" && row.completed) ||
      (lessonCompletionFilter === "NOT_COMPLETED" && !row.completed);
    if (!matchesStatus) return false;

    const keyword = lessonCompletionKeyword.trim().toLowerCase();
    if (!keyword) return true;

    return [row.studentName, row.studentNumber, row.email]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(keyword));
  });

  const formatLessonCompletionTime = (value) => {
    if (!value) {
      return t("classContent.lessonCompletion.defaults.notCompletedTime");
    }

    try {
      const locale = i18n.resolvedLanguage?.startsWith("vi") ? "vi-VN" : "en-US";
      return new Intl.DateTimeFormat(locale, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value));
    } catch (error) {
      return value;
    }
  };

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
    const normalizedUrl = url.trim();
    const lowerUrl = normalizedUrl.toLowerCase();

    // YouTube URL patterns
    const youtubeRegex =
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/;
    const youtubeMatch = normalizedUrl.match(youtubeRegex);
    if (youtubeMatch) {
      return { platform: "youtube", id: youtubeMatch[1] };
    }

    // Vimeo URL pattern
    const vimeoRegex = /vimeo\.com\/(\d+)/;
    const vimeoMatch = normalizedUrl.match(vimeoRegex);
    if (vimeoMatch) {
      return { platform: "vimeo", id: vimeoMatch[1] };
    }

    // OneDrive embed URL — generated via OneDrive "Embed" feature, works in iframe
    if (lowerUrl.includes("onedrive.live.com/embed") || lowerUrl.includes("1drv.ms/v/")) {
      return { platform: "onedrive", url: normalizedUrl };
    }
    // OneDrive share/view links — cannot be embedded due to X-Frame-Options
    if (lowerUrl.includes("1drv.ms") || lowerUrl.includes("onedrive.live.com")) {
      return { platform: "onedrive-share", url: normalizedUrl };
    }

    return null;
  };

  const getVideoEmbedUrl = (videoInfo) => {
    if (!videoInfo) return null;

    if (videoInfo.platform === "youtube") {
      return `https://www.youtube.com/embed/${videoInfo.id}?controls=1&modestbranding=1`;
    } else if (videoInfo.platform === "vimeo") {
      return `https://player.vimeo.com/video/${videoInfo.id}`;
    } else if (videoInfo.platform === "onedrive") {
      return videoInfo.url;
    }

    return null;
  };

  const videoInfo = extractVideoId(videoUrl);
  const videoEmbedUrl = getVideoEmbedUrl(videoInfo);
  const nonVideoResources = resources.filter((resource) => resource.type !== "VIDEO");

  const upsertPendingLibraryResource = (resource) => {
    if (!resource?.id) return;
    setPendingLibraryResources((prev) => {
      const withoutDuplicate = prev.filter((item) => item.id !== resource.id);
      return [...withoutDuplicate, resource];
    });
  };

  const replaceTemplateVideoResource = (resource) => {
    setResources((prev) => prev.filter((item) => item.type !== "VIDEO" && item.id !== resource?.id));
    setPendingLibraryResources((prev) => {
      const withoutExistingVideo = prev.filter((item) => item.type !== "VIDEO" && item.id !== resource?.id);
      return resource ? [...withoutExistingVideo, resource] : withoutExistingVideo;
    });
    setVideoResource(resource || null);
    setVideoSourceType(resource ? "upload" : "embed");
    if (resource) {
      setVideoUrl("");
    }
  };

  const handleVideoSourceTypeChange = (nextType) => {
    if (isViewMode || nextType === videoSourceType) return;
    setVideoSourceType(nextType);

    if (nextType === "upload") {
      setVideoUrl("");
      return;
    }

    setPendingVideoFile(null);
    if (isTemplateMode) {
      replaceTemplateVideoResource(null);
    }
  };

  const applySelectedVideoResource = async (resource) => {
    if (!resource?.id) return;

    setVideoResource(resource);
    setVideoSourceType("upload");
    setVideoUrl("");
    setPendingVideoFile(null);
    setResources((prev) => prev.filter((item) => item.type !== "VIDEO" && item.id !== resource.id));

    if (isTemplateMode || !lectureId) {
      setPendingLibraryResources((prev) => {
        const withoutExistingVideo = prev.filter((item) => item.type !== "VIDEO" && item.id !== resource.id);
        return [...withoutExistingVideo, resource];
      });
      return;
    }

    await attachResourceToLesson(lectureId, resource.id);
    const resourcesResponse = await getResourcesByLessonId(lectureId);
    const list = Array.isArray(resourcesResponse)
      ? resourcesResponse
      : resourcesResponse.data || [];
    setResources(list.filter((item) => item.id !== resource.id));
    setVideoResource(list.find((item) => item.id === resource.id) || resource);
  };

  const handleVideoMediaChange = async (mediaPatch) => {
    try {
      const selectedResource = mediaPatch?.resource || null;
      if (!selectedResource) {
        await handleDeleteVideo();
        return;
      }

      await applySelectedVideoResource(selectedResource);
      messageApi.success(isTemplateMode ? "Đã chọn video cho bài giảng mẫu" : "Đã chọn video cho bài giảng");
    } catch (error) {
      console.error(error);
      messageApi.error(error?.response?.data?.message || "Không thể chọn video từ kho media");
    }
  };

  const modules = buildQuillModules([
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    [createQuillTableControl()],
    [{ align: [] }],
    [{ color: [] }, { background: [] }],
    ["link", "image"],
    ["clean"],
  ]);

  const formats = extendQuillFormats([
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
  ]);

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        
        // Fetch course or template data based on mode
        if (isTemplateMode && templateIdFromPath) {
          const templateData = await getTemplateById(templateIdFromPath);
          setCourse(templateData);
        } else if (classSectionId) {
          const courseResponse = await getCourseById(classSectionId);
          setCourse(courseResponse.data || courseResponse);
        }

        // If has lectureId (editing or viewing), fetch lesson/lessonTemplate data
        if (lectureId) {
          const lessonResponse = isTemplateMode
            ? await getLessonTemplateById(lectureId)
            : await getLessonById(lectureId);
          const lessonData = lessonResponse.data || lessonResponse;
          setLesson(lessonData);
          
          setTitle(lessonData.title || "");
          setContent(lessonData.content || "");
          setVideoUrl(lessonData.videoUrl || "");
          setNotes(lessonData.notes || "");
          const resourcesList = Array.isArray(lessonData.resources)
            ? lessonData.resources
            : [];
          setResources(resourcesList);

          const videoRes = resourcesList.find((r) => r.type === "VIDEO");
          if (videoRes) {
            setVideoResource(videoRes);
            setVideoSourceType("upload");
          } else if (lessonData.videoUrl || isTemplateMode) {
            setVideoResource(null);
            setVideoSourceType("embed");
          }
          
          if (lessonData.attachments && Array.isArray(lessonData.attachments)) {
            setUploadedFiles(lessonData.attachments.map(file => ({
              id: file.id,
              name: file.name || file.filename,
              size: file.size ? (file.size / (1024 * 1024)).toFixed(1) : "0",
              url: file.url,
            })));
          }
        }
      } catch (err) {
        setError("Không thể tải dữ liệu");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [classSectionId, templateIdFromPath, lectureId, form, isTemplateMode]);

  // Fix for: Warning: Instance created by `useForm` is not connected to any Form element.
  useEffect(() => {
    if (!loading && lesson && form) {
      form.setFieldsValue({
        title: lesson.title,
        content: lesson.content,
      });
    }
  }, [loading, lesson, form]);

  const uploadTemplateScopedResource = async (file, { forceVideo = false, onProgress } = {}) => {
    if (!templateResourceScope.scopeType || !templateResourceScope.scopeId) {
      throw new Error("Không xác định được phạm vi media của khung chương trình");
    }

    const standalone = await createStandaloneResource({
      title: file.name,
      fileUrl: "",
      type: forceVideo ? "VIDEO" : "FILE",
      source: "UPLOAD",
      ...templateResourceScope,
    });

    const resourceId = standalone?.id;
    if (!resourceId) {
      throw new Error("Không tạo được media cho bài giảng mẫu");
    }

    if (forceVideo) {
      await uploadVideoResource(resourceId, file, onProgress);
    } else {
      await uploadAttachmentResource(resourceId, file, onProgress);
    }

    return getResourceById(resourceId);
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files || []);
    // Reset input early so re-selecting the same file works
    if (fileInputRef.current) fileInputRef.current.value = "";

    files.forEach((file) => {
      // Validate file type
      const allowedTypes = [
        "application/pdf",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ];
      if (!allowedTypes.includes(file.type)) {
        messageApi.error("Chỉ hỗ trợ file PDF, PPT và PPTX");
        return;
      }
      // Validate file size (50MB)
      if (file.size > 100 * 1024 * 1024) {
        messageApi.error("File không được vượt quá 100MB");
        return;
      }

      const fileId = Date.now() + Math.random();
      const newFile = {
        id: fileId,
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(1),
        file: file,
        isNew: true,
        uploading: false,
      };

      if (isTemplateMode) {
        const uploadingFile = { ...newFile, uploading: true };
        setUploadedFiles((prev) => [...prev, uploadingFile]);
        setIsUploading(true);

        (async () => {
          try {
            const uploadedResource = await uploadTemplateScopedResource(file, {
              onProgress: (percent) => {
                setFileUploadProgress((prev) => ({ ...prev, [fileId]: percent }));
              },
            });
            upsertPendingLibraryResource(uploadedResource);
            messageApi.success(`Tải lên ${file.name} thành công`);
          } catch (err) {
            console.error("Failed to upload template file:", err);
            messageApi.warning(err?.response?.data?.message || `Không thể tải lên file ${file.name}`);
            setUploadedFiles((prev) => prev.map((f) =>
              f.id === fileId ? { ...f, uploading: false, uploadError: true } : f
            ));
          } finally {
            setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
            setFileUploadProgress((prev) => {
              const next = { ...prev };
              delete next[fileId];
              return next;
            });
            setIsUploading(false);
          }
        })();
        return;
      }

      // In edit mode (lectureId exists, not template): upload immediately
      if (lectureId && !isTemplateMode) {
        const uploadingFile = { ...newFile, uploading: true };
        setUploadedFiles((prev) => [...prev, uploadingFile]);
        setIsUploading(true);

        (async () => {
          try {
            const resourceType = getResourceTypeFromFile(file);
            const resourceResponse = await createResource(lectureId, {
              title: file.name,
              fileUrl: "",
              type: resourceType,
              ...classResourceScope,
            });
            const resourceId = resourceResponse?.id || resourceResponse?.data?.id;

            if (resourceId) {
              const uploadFn = isVideoFile(file) ? uploadVideoResource : uploadSlideResource;
              await uploadFn(resourceId, file, (percent) => {
                setFileUploadProgress((prev) => ({ ...prev, [fileId]: percent }));
              });

              // Refresh the resource list
              const resourcesResponse = await getResourcesByLessonId(lectureId);
              const list = Array.isArray(resourcesResponse)
                ? resourcesResponse
                : resourcesResponse.data || [];
              setResources(list);

              messageApi.success(`Tải lên ${file.name} thành công`);
            }
          } catch (err) {
            console.error("Failed to upload file:", err);
            messageApi.warning(`Không thể tải lên file ${file.name}`);
            setUploadedFiles((prev) => prev.map((f) =>
              f.id === fileId ? { ...f, uploading: false, uploadError: true } : f
            ));
          } finally {
            // Remove the pending entry (success or error)
            setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
            setFileUploadProgress((prev) => {
              const next = { ...prev };
              delete next[fileId];
              return next;
            });
            setIsUploading(false);
          }
        })();
      } else {
        // Create mode or template mode: defer upload to handleSubmit
        setUploadedFiles((prev) => [...prev, newFile]);
      }
    });
  };

  const handleDeleteFile = (fileId) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const handleRemovePendingLibraryResource = (resourceId) => {
    setPendingLibraryResources((prev) => prev.filter((item) => item.id !== resourceId));
  };

  const handleDetachSavedResource = async (resourceId) => {
    if (!resourceId) return;
    if (isTemplateMode) {
      setResources((prev) => prev.filter((resource) => resource.id !== resourceId));
      messageApi.success("Đã gỡ media khỏi bài giảng mẫu");
      return;
    }
    if (!lectureId) return;
    try {
      await detachResourceFromLesson(lectureId, resourceId);
      const resourcesResponse = await getResourcesByLessonId(lectureId);
      const list = Array.isArray(resourcesResponse)
        ? resourcesResponse
        : resourcesResponse.data || [];
      setResources(list);
      messageApi.success("Đã gỡ media khỏi bài giảng");
    } catch (error) {
      console.error(error);
      messageApi.error(error?.response?.data?.message || "Không thể gỡ media khỏi bài giảng");
    }
  };

  const handleSelectLibraryResource = async (resource) => {
    if (!resource) return;

    const duplicateInSaved = resources.some((item) => item.id === resource.id);
    const duplicateInPending = pendingLibraryResources.some((item) => item.id === resource.id);
    if (duplicateInSaved || duplicateInPending) {
      messageApi.info("Media này đã có trong bài giảng");
      setLibraryPickerOpen(false);
      return;
    }

    if (lectureId && !isTemplateMode) {
      try {
        await attachResourceToLesson(lectureId, resource.id);
        const resourcesResponse = await getResourcesByLessonId(lectureId);
        const list = Array.isArray(resourcesResponse)
          ? resourcesResponse
          : resourcesResponse.data || [];
        setResources(list);
        messageApi.success("Đã gắn media vào bài giảng");
      } catch (error) {
        console.error(error);
        messageApi.error(error?.response?.data?.message || "Không thể gắn media vào bài giảng");
      } finally {
        setLibraryPickerOpen(false);
      }
      return;
    }

    setPendingLibraryResources((prev) => [...prev, resource]);
    messageApi.success(isTemplateMode ? "Đã chọn media cho bài giảng mẫu" : "Đã thêm media vào danh sách chờ");
    setLibraryPickerOpen(false);
  };

  const handleSubmit = async () => {
    // Prevent submission in view mode
    if (isViewMode) return;
    
    try {
      setSubmitting(true);
      
      // Prepare lesson data
      const effectiveVideoUrl = videoSourceType === "embed" ? videoUrl.trim() : "";
      const lessonData = {
        title: title.trim(),
        content: content.trim(),
        videoUrl: effectiveVideoUrl,
        notes: notes.trim(),
        chapterId: chapterId, // Assuming chapterId is passed in params
      };
      const templateResourceIds = Array.from(
        new Set([...resources, ...pendingLibraryResources]
          .filter((resource) => videoSourceType === "upload" || resource?.type !== "VIDEO")
          .map((resource) => resource?.id)
          .filter(Boolean))
      );

      // Validate required fields
      if (!lessonData.title) {
        messageApi.error("Vui lòng nhập tiêu đề bài giảng");
        return;
      }

      if (!lessonData.content) {
        messageApi.error("Vui lòng nhập nội dung bài giảng");
        return;
      }

      let savedLesson;
      
      if (isTemplateMode && templateIdFromPath) {
        if (isEditMode) {
          // ── Template edit: update existing LessonTemplate ──
          savedLesson = await updateLessonTemplate(lectureId, {
            title: lessonData.title,
            content: lessonData.content,
            videoUrl: lessonData.videoUrl,
            notes: lessonData.notes,
            resourceIds: templateResourceIds,
          });
          messageApi.success("Cập nhật bài giảng mẫu thành công");
        } else {
          // ── Template create: create LessonTemplate → link to template chapter ──
          savedLesson = await createLessonTemplate({
            title: lessonData.title,
            content: lessonData.content,
            videoUrl: lessonData.videoUrl,
            notes: lessonData.notes,
            resourceIds: templateResourceIds,
          });

          await createContentItemTemplate(templateIdFromPath, chapterIdFromState, {
            itemType: "LESSON",
            lessonTemplateId: savedLesson.id,
          });

          messageApi.success("Tạo và gắn bài giảng vào chương trình thành công");
        }
      } else if (isEditMode) {
        // Update existing lesson in class section
        const response = await updateLesson(lectureId, lessonData);
        savedLesson = response.data;
        messageApi.success("Cập nhật bài giảng thành công");
      } else {
        // ── Class section flow: create lesson → link to class chapter ──
        const response = await createLesson({
          title: lessonData.title,
          content: lessonData.content,
          videoUrl: lessonData.videoUrl,
          notes: lessonData.notes,
        });
        savedLesson = response.data;

        const chapterIdForSection = chapterId || chapterIdFromState;
        if (classSectionId && chapterIdForSection) {
          await createClassContentItem(classSectionId, chapterIdForSection, {
            itemType: "LESSON",
            lessonId: savedLesson.id,
            title: lessonData.title,
          });
        }
        messageApi.success("Tạo bài giảng thành công");
      }

      // Upload pending video (create mode only)
      if (!isTemplateMode && pendingVideoFile && savedLesson?.id) {
        setIsVideoUploading(true);
        setVideoUploadProgress(0);
        try {
          const resourceResponse = await createResource(savedLesson.id, {
            title: pendingVideoFile.name,
            fileUrl: "",
            type: "VIDEO",
            source: "UPLOAD",
            ...classResourceScope,
          });
          const resourceId = resourceResponse?.id || resourceResponse?.data?.id;
          if (resourceId) {
            await uploadVideoResource(resourceId, pendingVideoFile, (percent) => {
              setVideoUploadProgress(percent);
            });
            setVideoUrl("");
          }
        } catch (uploadErr) {
          console.error("Failed to upload video:", uploadErr);
          messageApi.warning("Không thể tải lên video");
        } finally {
          setIsVideoUploading(false);
          setVideoUploadProgress(0);
          setPendingVideoFile(null);
        }
      }

      // Attach pending resources selected from media library (create mode only)
      if (!isTemplateMode && pendingLibraryResources.length > 0 && savedLesson?.id) {
        for (const resource of pendingLibraryResources) {
          try {
            await attachResourceToLesson(savedLesson.id, resource.id);
          } catch (attachErr) {
            console.error("Failed to attach library resource:", attachErr);
            messageApi.warning(`Không thể gắn media: ${resource.title || "Resource"}`);
          }
        }
        setPendingLibraryResources([]);
      }

      // Class-section create mode uploads remaining local files here. Template files are uploaded into
      // the curriculum media scope immediately and attached through resourceIds above.
      // In edit mode, files are already uploaded immediately on select — only pending files remain here
      const newFiles = isTemplateMode ? [] : uploadedFiles.filter(f => f.file && !f.uploading);
      if (newFiles.length > 0 && savedLesson?.id) {
        setIsUploading(true);
        for (const file of newFiles) {
          try {
            const resourceType = getResourceTypeFromFile(file.file);
            const resourceResponse = await createResource(savedLesson.id, {
              title: file.name,
              fileUrl: "",
              type: resourceType,
              ...classResourceScope,
            });
            if (resourceResponse?.id || resourceResponse?.data?.id) {
              const resourceId = resourceResponse.id || resourceResponse.data.id;
              const uploadFn = isVideoFile(file.file) ? uploadVideoResource : uploadSlideResource;
              await uploadFn(resourceId, file.file, (percent) => {
                setFileUploadProgress((prev) => ({ ...prev, [file.id]: percent }));
              });
            }
          } catch (uploadErr) {
            console.error("Failed to upload file:", uploadErr);
            messageApi.warning(`Không thể tải lên file ${file.name}`);
          }
        }
        setIsUploading(false);
        setFileUploadProgress({});
      }

      // Navigate back
      setTimeout(() => {
        const base = isAdmin ? "/admin" : "/teacher";
        if (isTemplateMode && templateIdFromPath) {
          navigate(`${base}/curriculums/${templateIdFromPath}`);
        } else {
          navigate(`${base}/class-sections/${classSectionId}`);
        }
      }, 500);
    } catch (err) {
      messageApi.error(err.message || "Không thể lưu bài giảng");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    modalApi.confirm({
      title: "Xác nhận xóa bài giảng",
      content: "Bạn có chắc chắn muốn xóa bài giảng này? Hành động này không thể hoàn tác.",
      okText: "Xóa",
      cancelText: "Hủy bỏ",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          setSubmitting(true);
          await deleteLesson(lectureId);
          messageApi.success("Xóa bài giảng thành công");
          navigate(`/teacher/class-sections/${classSectionId}`);
        } catch (err) {
          messageApi.error(err.message || "Không thể xóa bài giảng");
          console.error(err);
        } finally {
          setSubmitting(false);
        }
      },
    });
  };

  const handleVideoFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (videoFileInputRef.current) videoFileInputRef.current.value = "";
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      messageApi.error("Chỉ hỗ trợ file video (MP4, WebM, MOV...)");
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      messageApi.error("File video không được vượt quá 100MB");
      return;
    }

    // Create mode: defer upload until lesson is saved
    if (!lectureId && !isTemplateMode) {
      setPendingVideoFile(file);
      setVideoUrl("");
      return;
    }

    setIsVideoUploading(true);
    setVideoUploadProgress(0);

    try {
      if (isTemplateMode) {
        const uploadedResource = await uploadTemplateScopedResource(file, {
          forceVideo: true,
          onProgress: (percent) => {
            setVideoUploadProgress(percent);
          },
        });
        replaceTemplateVideoResource(uploadedResource);
        messageApi.success("Upload video cho bài giảng mẫu thành công");
      } else {
        const resourceResponse = await createResource(lectureId, {
          title: file.name,
          fileUrl: "",
          type: "VIDEO",
          source: "UPLOAD",
          ...classResourceScope,
        });
        const resourceId = resourceResponse?.id || resourceResponse?.data?.id;

        if (resourceId) {
          await uploadVideoResource(resourceId, file, (percent) => {
            setVideoUploadProgress(percent);
          });

          const resourcesResponse = await getResourcesByLessonId(lectureId);
          const list = Array.isArray(resourcesResponse)
            ? resourcesResponse
            : resourcesResponse.data || [];
          setResources(list);

          const uploaded = list.find((r) => r.id === resourceId);
          setVideoResource(uploaded || null);
          setVideoUrl("");
          messageApi.success("Upload video thành công");
        }
      }
    } catch (err) {
      console.error("Video upload failed:", err);
      messageApi.error(err?.response?.data?.message || "Không thể upload video. Vui lòng thử lại.");
    } finally {
      setIsVideoUploading(false);
      setVideoUploadProgress(0);
    }
  };

  const handleDeleteVideo = async () => {
    if (!videoResource) {
      setPendingVideoFile(null);
      return;
    }
    if (isTemplateMode) {
      replaceTemplateVideoResource(null);
      messageApi.success("Đã gỡ video khỏi bài giảng mẫu. Media vẫn còn trong thư viện.");
      return;
    }
    if (!lectureId) {
      setVideoResource(null);
      setPendingLibraryResources((prev) => prev.filter((resource) => resource.id !== videoResource.id));
      setPendingVideoFile(null);
      messageApi.success("Đã gỡ video khỏi bài giảng");
      return;
    }
    try {
      await detachResourceFromLesson(lectureId, videoResource.id);
      const resourcesResponse = await getResourcesByLessonId(lectureId);
      const list = Array.isArray(resourcesResponse)
        ? resourcesResponse
        : resourcesResponse.data || [];
      setVideoResource(null);
      setResources(list);
      messageApi.success("Đã gỡ video khỏi bài giảng. Media vẫn còn trong thư viện.");
    } catch (err) {
      console.error("Delete video failed:", err);
      messageApi.error("Không thể gỡ video");
    }
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
    <div className="lecture-detail-page min-h-screen bg-background-light dark:bg-background-dark font-display text-[#111418] dark:text-white">
      <TeacherHeader />
      <div className="flex">
        {isAdmin ? <AdminSidebar /> : <TeacherSidebar />}
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
              <AppBreadcrumb
                className="mb-5"
                context={{
                  classTitle: course?.title,
                  templateName: course?.name,
                  lectureTitle: title || lesson?.title,
                }}
              />
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
                      {canOpenLessonCompletion && (
                        <>
                          <Button
                            onClick={handleOpenLessonCompletion}
                            className="px-6 py-2.5 h-10 rounded-lg font-bold flex items-center gap-2 border-emerald-400 text-emerald-600 hover:border-emerald-500 hover:text-emerald-700"
                            icon={<CheckCircleIcon className="h-4 w-4" />}
                          >
                            {t("classContent.lessonCompletion.actions.open")}
                          </Button>
                          <Button
                            onClick={() => {
                              const doNavigate = () => navigate(`/teacher/class-sections/${classSectionId}/lectures/${lectureId}/preview`);
                              if (isEditMode) {
                                modalApi.confirm({
                                  title: "Xem trước bài giảng",
                                  content: "Trang xem trước hiển thị phiên bản đã lưu. Các thay đổi chưa lưu sẽ không xuất hiện.",
                                  okText: "Xem trước",
                                  cancelText: "Hủy",
                                  onOk: doNavigate,
                                });
                              } else {
                                doNavigate();
                              }
                            }}
                            className="px-6 py-2.5 h-10 rounded-lg font-bold flex items-center gap-2 border-amber-400 text-amber-600 hover:border-amber-500 hover:text-amber-700"
                            icon={<EyeIcon className="h-4 w-4" />}
                          >
                            Xem như người học
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Main Form Grid */}
              <Form layout="vertical" className="grid grid-cols-1 gap-6" form={form}>
                <div className="space-y-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-[#111418] dark:text-gray-200 text-base font-medium">
                      {isTemplateMode ? "Thuộc khung chương trình" : "Thuộc khóa học"}
                    </label>
                    <div className="px-4 py-3 rounded-lg bg-primary bg-gray-50 dark:bg-gray-700 border border-[#dbe0e6] dark:border-gray-600">
                      <p className="text-white font-medium">
                        {isTemplateMode ? course?.name : course?.title}
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
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400">
                            <PlayCircleIcon className="h-6 w-6" />
                          </div>
                          <h3 className="font-bold text-lg dark:text-white">Video bài giảng</h3>
                        </div>
                        {!isViewMode && (
                          <MediaAttachButton
                            resource={videoResource}
                            allowedTypes={["VIDEO"]}
                            mediaContext={activeMediaScope}
                            label="Chọn từ kho media"
                            onChange={handleVideoMediaChange}
                          />
                        )}
                      </div>

                      {/* Source type toggle */}
                      <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
                        <button
                          type="button"
                          onClick={() => handleVideoSourceTypeChange("embed")}
                          className={`flex-1 py-2 text-sm font-medium transition-colors ${
                            videoSourceType === "embed"
                              ? "bg-primary text-white"
                              : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                          } ${isViewMode ? "cursor-default" : "cursor-pointer"}`}
                        >
                          YouTube / Vimeo / OneDrive
                        </button>
                        <button
                          type="button"
                          onClick={() => handleVideoSourceTypeChange("upload")}
                          className={`flex-1 py-2 text-sm font-medium transition-colors border-l border-gray-200 dark:border-gray-600 ${
                            videoSourceType === "upload"
                              ? "bg-primary text-white"
                              : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                          } ${isViewMode ? "cursor-default" : "cursor-pointer"}`}
                        >
                          Upload Video
                        </button>
                      </div>

                      {/* Embed tab */}
                      {videoSourceType === "embed" && (
                        <>
                          <Form.Item
                            label="Link Video"
                            labelCol={{ className: "text-sm font-medium dark:text-gray-300" }}
                            className="mb-2"
                          >
                            <div className="flex gap-2">
                              <Input
                                placeholder="Dán link YouTube, Vimeo, hoặc OneDrive embed..."
                                size="large"
                                value={videoUrl}
                                onChange={(e) => setVideoUrl(e.target.value)}
                                disabled={isViewMode}
                                className={`flex-1 bg-[#f8f9fa] dark:bg-gray-800 border-[#dbe0e6] dark:border-gray-600 ${isViewMode ? "disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:text-[#111418] dark:disabled:text-white" : ""}`}
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
                              />
                            </div>
                          ) : videoInfo?.platform === "onedrive-share" ? (
                            <div className="relative w-full aspect-video bg-blue-50 dark:bg-blue-900/20 rounded-lg flex flex-col items-center justify-center border border-blue-200 dark:border-blue-700 gap-3 p-6 text-center">
                              <p className="text-blue-700 dark:text-blue-300 font-semibold text-sm">Link OneDrive không thể nhúng trực tiếp</p>
                              <p className="text-gray-600 dark:text-gray-400 text-xs max-w-xs">
                                Cần dùng link embed. Trong OneDrive: chuột phải vào file → <strong>Nhúng</strong> → sao chép URL trong thuộc tính <code>src</code> của thẻ iframe.
                              </p>
                              <p className="text-gray-500 dark:text-gray-500 text-xs">
                                URL đúng có dạng: <code>https://onedrive.live.com/embed?resid=...</code>
                              </p>
                            </div>
                          ) : (
                            <div className="relative w-full aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center border border-dashed border-gray-300 dark:border-gray-600">
                              <div className="bg-white/90 dark:bg-black/70 p-3 rounded-full shadow-lg">
                                <PlayCircleIcon className="h-8 w-8 text-primary" />
                              </div>
                              <div className="absolute bottom-3 left-3 bg-black/70 px-2 py-1 rounded text-xs text-white">
                                Preview Mode
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {/* Upload tab */}
                      {videoSourceType === "upload" && (
                        <div className="flex flex-col gap-3">
                          {videoResource ? (
                            <>
                              <ResourceRenderer resource={videoResource} className="m-0" />
                              {!isViewMode && (
                                <button
                                  type="button"
                                  onClick={handleDeleteVideo}
                                  className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors self-start"
                                >
                                  <TrashIcon className="h-4 w-4" /> Gỡ video
                                </button>
                              )}
                            </>
                          ) : pendingVideoFile ? (
                            <div className="flex flex-col gap-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 overflow-hidden">
                                  <div className="p-2 bg-primary/10 rounded-lg">
                                    <PlayCircleIcon className="h-5 w-5 text-primary" />
                                  </div>
                                    <div className="flex flex-col min-w-0">
                                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{pendingVideoFile.name}</p>
                                    <p className="text-xs text-gray-500">{(pendingVideoFile.size / (1024 * 1024)).toFixed(1)} MB — Sẽ upload khi lưu bài giảng</p>
                                    </div>
                                  </div>
                                  <button
                                  type="button"
                                  onClick={() => setPendingVideoFile(null)}
                                  className="text-gray-400 hover:text-red-500 transition-colors shrink-0"
                                >
                                  <XMarkIcon className="h-5 w-5" />
                                </button>
                              </div>
                            </div>
                          ) : isVideoUploading ? (
                            <div className="flex flex-col gap-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
                                <span className="font-medium">Đang upload video...</span>
                                <span className="font-mono">{videoUploadProgress}%</span>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                                <div
                                  className="bg-primary h-2 rounded-full transition-all duration-200"
                                  style={{ width: `${videoUploadProgress}%` }}
                                />
                              </div>
                            </div>
                          ) : !isViewMode ? (
                            <div
                              onClick={() => videoFileInputRef.current?.click()}
                              className="w-full aspect-video bg-gray-50 dark:bg-gray-800/50 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-primary dark:hover:border-primary transition-colors"
                            >
                              <div className="p-3 bg-primary/10 rounded-full">
                                <CloudArrowUpIcon className="h-8 w-8 text-primary" />
                              </div>
                              <div className="text-center">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  Click để chọn file video
                                </p>
                                <p className="text-xs text-gray-400 mt-1">MP4, WebM, MOV — tối đa 100MB</p>
                              </div>
                              <input
                                ref={videoFileInputRef}
                                type="file"
                                accept="video/*"
                                onChange={handleVideoFileSelect}
                                className="hidden"
                              />
                            </div>
                          ) : (
                            <div className="w-full aspect-video bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center border border-gray-200 dark:border-gray-700">
                              <p className="text-sm text-gray-400">Chưa có video được upload</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Document/Slides Section */}
                    <div className="bg-white dark:bg-card-dark p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col gap-4">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                            <DocumentTextIcon className="h-6 w-6" />
                          </div>
                          <h3 className="font-bold text-lg dark:text-white">
                            Tài liệu / Slide
                          </h3>
                        </div>
                        {!isViewMode && (
                          <Button onClick={() => setLibraryPickerOpen(true)}>
                            Chọn từ kho media
                          </Button>
                        )}
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
                          Kéo thả file PDF/PPTX vào đây hoặc{" "}
                          <span className="text-primary hover:underline">
                            tải lên
                          </span>
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          Hỗ trợ: PDF, PPTX (Max 100MB)
                        </p>
                        {isTemplateMode && (
                          <p className="mt-2 text-xs text-gray-500 text-center">
                            File được tải lên kho media của khung chương trình và sẽ gắn vào bài giảng mẫu khi bạn lưu.
                          </p>
                        )}
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept=".pdf,.ppt,.pptx"
                          onChange={handleFileSelect}
                          className="!hidden"
                        />
                      </div>
                      {/* File List Items - Pending / Uploading */}
                      {pendingLibraryResources.length > 0 && (
                        <div className="space-y-2">
                          {pendingLibraryResources.map((resource) => (
                            <FileItem
                              key={`pending-library-${resource.id}`}
                              fileUrl={resource.fileUrl}
                              fileName={resource.title || "Resource"}
                              fileSize={resource.fileSize}
                              mimeType={resource.mimeType}
                              type={resource.type}
                              source={resource.source}
                              embedUrl={resource.embedUrl}
                              onDelete={() => handleRemovePendingLibraryResource(resource.id)}
                              showDelete={!isViewMode}
                            />
                          ))}
                        </div>
                      )}

                      {/* File List Items - Pending / Uploading */}
                      {uploadedFiles.length > 0 && (
                        <div className="space-y-2">
                          {uploadedFiles.map((file) => {
                            const progress = fileUploadProgress[file.id];
                            const isFileUploading = file.uploading || (progress !== undefined);
                            return (
                              <div
                                key={file.id}
                                className="flex flex-col p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-sm gap-2"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded text-red-600 dark:text-red-400 shrink-0">
                                      <DocumentTextIcon className="h-5 w-5" />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                        {file.name}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {file.size} MB •{" "}
                                        {isFileUploading
                                          ? (progress !== undefined ? `${progress}%` : "Đang chuẩn bị...")
                                          : "Chờ lưu"}
                                      </p>
                                    </div>
                                  </div>
                                  {!isFileUploading && (
                                    <button
                                      onClick={() => handleDeleteFile(file.id)}
                                      className="text-gray-400 hover:text-red-500 transition-colors"
                                    >
                                      <XMarkIcon className="h-5 w-5" />
                                    </button>
                                  )}
                                </div>
                                {/* Progress bar */}
                                {isFileUploading && (
                                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className="bg-primary h-1.5 rounded-full transition-all duration-200"
                                      style={{ width: `${progress ?? 0}%` }}
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Resources List Section - Already Uploaded */}
                      {nonVideoResources.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                          <h3 className="text-sm font-semibold text-[#111418] dark:text-white mb-3">
                            Tài nguyên đã tải lên
                          </h3>
                          <div className="space-y-2">
                            {nonVideoResources.map((resource) => (
                              <FileItem
                                key={resource.id}
                                fileUrl={resource.fileUrl || resource.url}
                                fileName={resource.title || "Resource"}
                                fileSize={resource.fileSize}
                                mimeType={resource.mimeType}
                                type={resource.type}
                                source={resource.source}
                                embedUrl={resource.embedUrl}
                                onDelete={() => handleDetachSavedResource(resource.id)}
                                showDelete={!isViewMode}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <ResourceLibrarySelectModal
                    open={libraryPickerOpen}
                    onCancel={() => setLibraryPickerOpen(false)}
                    onSelect={handleSelectLibraryResource}
                    mediaContext={activeMediaScope}
                    title="Chọn media từ kho của tôi"
                    allowedTypes={["IMAGE", "AUDIO", "PDF", "FILE", "LINK"]}
                  />

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

                  <Modal
                    title={t("classContent.lessonCompletion.title")}
                    open={lessonCompletionModalOpen}
                    onCancel={closeLessonCompletionModal}
                    footer={null}
                    width={860}
                    centered
                  >
                    <div className="space-y-5">
                      <p className="m-0 text-sm text-slate-500 dark:text-slate-400">
                        {t("classContent.lessonCompletion.subtitle")}
                      </p>
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/70">
                          <p className="m-0 text-xs text-slate-500 dark:text-slate-400">{t("classContent.lessonCompletion.summary.students")}</p>
                          <p className="m-0 mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{lessonCompletionRows.length}</p>
                        </div>
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                          <p className="m-0 text-xs text-emerald-700 dark:text-emerald-300">{t("classContent.lessonCompletion.summary.completed")}</p>
                          <p className="m-0 mt-1 text-2xl font-semibold text-emerald-700 dark:text-emerald-200">{lessonCompletionCounts.completed}</p>
                        </div>
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/60 dark:bg-amber-950/30">
                          <p className="m-0 text-xs text-amber-700 dark:text-amber-300">{t("classContent.lessonCompletion.summary.notCompleted")}</p>
                          <p className="m-0 mt-1 text-2xl font-semibold text-amber-700 dark:text-amber-200">{lessonCompletionCounts.notCompleted}</p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <Segmented
                          value={lessonCompletionFilter}
                          onChange={setLessonCompletionFilter}
                          options={[
                            { label: t("classContent.lessonCompletion.filters.status.all"), value: "ALL" },
                            { label: t("classContent.lessonCompletion.filters.status.completed"), value: "COMPLETED" },
                            { label: t("classContent.lessonCompletion.filters.status.notCompleted"), value: "NOT_COMPLETED" },
                          ]}
                        />
                        <Input.Search
                          allowClear
                          value={lessonCompletionKeyword}
                          onChange={(event) => setLessonCompletionKeyword(event.target.value)}
                          placeholder={t("classContent.lessonCompletion.filters.searchPlaceholder")}
                          className="w-full lg:max-w-sm"
                        />
                      </div>
                      {lessonCompletionLoading ? (
                        <div className="flex min-h-56 items-center justify-center">
                          <Spin size="large" />
                        </div>
                      ) : filteredLessonCompletionRows.length > 0 ? (
                        <div className="space-y-3">
                          {filteredLessonCompletionRows.map((row) => (
                            <div
                              key={row.studentId}
                              className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800/80 md:flex-row md:items-center md:justify-between"
                            >
                              <UserIdentity
                                user={row}
                                variant="student"
                                avatarSizeClass="size-11"
                                avatarClassName="ring-1 ring-slate-200 dark:ring-slate-700"
                                fallbackName={t("reportsPage.shared.defaults.noName")}
                                className="min-w-0"
                              />
                              <div className="grid gap-3 md:grid-cols-[140px_180px] md:items-center">
                                <div>
                                  <p className="m-0 text-[11px] uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                                    {t("classContent.lessonCompletion.table.status")}
                                  </p>
                                  <span
                                    className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                                      row.completed
                                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200"
                                    }`}
                                  >
                                    {row.completed
                                      ? t("classContent.lessonCompletion.status.completed")
                                      : t("classContent.lessonCompletion.status.notCompleted")}
                                  </span>
                                </div>
                                <div>
                                  <p className="m-0 text-[11px] uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                                    {t("classContent.lessonCompletion.table.completedAt")}
                                  </p>
                                  <p className="m-0 mt-1 text-sm text-slate-700 dark:text-slate-300">
                                    {formatLessonCompletionTime(row.completedAt)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-10 dark:border-slate-700 dark:bg-slate-800/60">
                          <Empty
                            description={
                              <span className="text-slate-500 dark:text-slate-400">
                                {lessonCompletionRows.length > 0
                                  ? t("classContent.lessonCompletion.empty.filtered")
                                  : t("classContent.lessonCompletion.empty.default")}
                              </span>
                            }
                          />
                        </div>
                      )}
                    </div>
                  </Modal>
                </div>
              </Form>
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
                  onClick={() => {
                    isViewMode ? navigate(-1) : setIsViewMode(true);
                  }}
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-[#111418] dark:text-white font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || isViewMode || isUploading}
                  className="px-6 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white font-bold transition-all shadow-md shadow-primary/20 flex items-center gap-2 text-sm disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <Spin size="small" style={{ color: "white" }} />
                      Đang tải file...
                    </>
                  ) : submitting ? (
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
