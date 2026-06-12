import React from "react";
import { Link, matchPath, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

function item(label, to = null) {
  return { label, to };
}

function current(label) {
  return { label, to: null, current: true };
}

function labelOrFallback(value, fallback) {
  return value || fallback;
}

function matchExact(pattern, pathname) {
  return matchPath({ path: pattern, end: true }, pathname);
}

function buildStudentBreadcrumb(pathname, context, t) {
  let params = null;

  if (matchExact("/home", pathname)) {
    return [current(t("breadcrumbs.home"))];
  }

  if (matchExact("/classes", pathname)) {
    return [current(t("breadcrumbs.classes"))];
  }

  if (matchExact("/student/assignments", pathname)) {
    return [current(t("breadcrumbs.myAssignments"))];
  }

  if (matchExact("/notifications", pathname)) {
    return [current(t("breadcrumbs.notifications"))];
  }

  if (matchExact("/student/profile", pathname)) {
    return [current(t("breadcrumbs.profile"))];
  }

  if (matchExact("/student/profile/information", pathname)) {
    return [item(t("breadcrumbs.profile"), "/student/profile"), current(t("breadcrumbs.information"))];
  }

  if (matchExact("/student/profile/classes", pathname)) {
    return [item(t("breadcrumbs.profile"), "/student/profile"), current(t("breadcrumbs.classes"))];
  }

  if (matchExact("/student/profile/certificate", pathname)) {
    return [item(t("breadcrumbs.profile"), "/student/profile"), current(t("breadcrumbs.certificate"))];
  }

  if (matchExact("/student/profile/notifications", pathname)) {
    return [item(t("breadcrumbs.profile"), "/student/profile"), current(t("breadcrumbs.notifications"))];
  }

  if (matchExact("/student/profile/password", pathname)) {
    return [item(t("breadcrumbs.profile"), "/student/profile"), current(t("breadcrumbs.password"))];
  }

  if (matchExact("/student/profile/settings", pathname)) {
    return [item(t("breadcrumbs.profile"), "/student/profile"), current(t("breadcrumbs.settings"))];
  }

  params = matchExact("/class-sections/:id", pathname)?.params;
  if (params) {
    return [
      item(t("breadcrumbs.classes"), "/classes"),
      current(labelOrFallback(context.classTitle, t("breadcrumbs.currentClass"))),
    ];
  }

  params = matchExact("/class-sections/:classSectionId/lectures/:lectureId", pathname)?.params;
  if (params) {
    return [
      item(t("breadcrumbs.classes"), "/classes"),
      item(
        labelOrFallback(context.classTitle, t("breadcrumbs.currentClass")),
        `/class-sections/${params.classSectionId}`
      ),
      item(t("breadcrumbs.lectures")),
      current(labelOrFallback(context.lectureTitle, t("breadcrumbs.currentLecture"))),
    ];
  }

  params = matchExact("/class-sections/:classSectionId/assignments/:assignmentId", pathname)?.params;
  if (params) {
    return [
      item(t("breadcrumbs.classes"), "/classes"),
      item(
        labelOrFallback(context.classTitle, t("breadcrumbs.currentClass")),
        `/class-sections/${params.classSectionId}`
      ),
      item(t("breadcrumbs.assignments")),
      current(labelOrFallback(context.assignmentTitle, t("breadcrumbs.currentAssignment"))),
    ];
  }

  params = matchExact("/class-sections/:classSectionId/quizzes/:id/detail", pathname)?.params;
  if (params) {
    return [
      item(t("breadcrumbs.classes"), "/classes"),
      item(
        labelOrFallback(context.classTitle, t("breadcrumbs.currentClass")),
        `/class-sections/${params.classSectionId}`
      ),
      item(t("breadcrumbs.quizzes")),
      current(labelOrFallback(context.quizTitle, t("breadcrumbs.currentQuiz"))),
    ];
  }

  params = matchExact("/class-sections/:classSectionId/quizzes/:id/attempt", pathname)?.params;
  if (params) {
    return [
      item(t("breadcrumbs.classes"), "/classes"),
      item(
        labelOrFallback(context.classTitle, t("breadcrumbs.currentClass")),
        `/class-sections/${params.classSectionId}`
      ),
      item(t("breadcrumbs.quizzes")),
      item(
        labelOrFallback(context.quizTitle, t("breadcrumbs.currentQuiz")),
        `/class-sections/${params.classSectionId}/quizzes/${params.id}/detail`
      ),
      current(t("breadcrumbs.attempt")),
    ];
  }

  params = matchExact("/class-sections/:classSectionId/quizzes/:id/result", pathname)?.params;
  if (params) {
    return [
      item(t("breadcrumbs.classes"), "/classes"),
      item(
        labelOrFallback(context.classTitle, t("breadcrumbs.currentClass")),
        `/class-sections/${params.classSectionId}`
      ),
      item(t("breadcrumbs.quizzes")),
      item(
        labelOrFallback(context.quizTitle, t("breadcrumbs.currentQuiz")),
        `/class-sections/${params.classSectionId}/quizzes/${params.id}/detail`
      ),
      current(t("breadcrumbs.result")),
    ];
  }

  params = matchExact("/class-sections/:classSectionId/quizzes/:id/attempts/:attemptId", pathname)?.params;
  if (params) {
    return [
      item(t("breadcrumbs.classes"), "/classes"),
      item(
        labelOrFallback(context.classTitle, t("breadcrumbs.currentClass")),
        `/class-sections/${params.classSectionId}`
      ),
      item(t("breadcrumbs.quizzes")),
      item(
        labelOrFallback(context.quizTitle, t("breadcrumbs.currentQuiz")),
        `/class-sections/${params.classSectionId}/quizzes/${params.id}/detail`
      ),
      current(t("breadcrumbs.result")),
    ];
  }

  return [];
}

function buildTeachingBreadcrumb(pathname, context, t) {
  const prefix = "/teaching";
  const relativePath = pathname.slice(prefix.length) || "/";
  let params = null;

  if (matchExact("/dashboard", relativePath)) {
    return [current(t("breadcrumbs.dashboard"))];
  }

  if (matchExact("/classes", relativePath)) {
    return [current(t("breadcrumbs.teachingClasses"))];
  }

  params = matchExact("/class-sections/:id", relativePath)?.params;
  if (params) {
    return [
      item(t("breadcrumbs.teachingClasses"), `${prefix}/classes`),
      current(labelOrFallback(context.classTitle, t("breadcrumbs.currentClass"))),
    ];
  }

  params = matchExact("/class-sections/:id/content", relativePath)?.params;
  if (params) {
    return [
      item(t("breadcrumbs.teachingClasses"), `${prefix}/classes`),
      item(
        labelOrFallback(context.classTitle, t("breadcrumbs.currentClass")),
        `${prefix}/class-sections/${params.id}`
      ),
      current(t("breadcrumbs.content")),
    ];
  }

  params = matchExact("/class-sections/:id/people", relativePath)?.params;
  if (params) {
    return [
      item(t("breadcrumbs.teachingClasses"), `${prefix}/classes`),
      item(
        labelOrFallback(context.classTitle, t("breadcrumbs.currentClass")),
        `${prefix}/class-sections/${params.id}`
      ),
      current(t("breadcrumbs.people")),
    ];
  }

  params = matchExact("/class-sections/:id/review", relativePath)?.params;
  if (params) {
    return [
      item(t("breadcrumbs.teachingClasses"), `${prefix}/classes`),
      item(
        labelOrFallback(context.classTitle, t("breadcrumbs.currentClass")),
        `${prefix}/class-sections/${params.id}`
      ),
      current(t("breadcrumbs.review")),
    ];
  }

  params = matchExact("/class-sections/:id/announcements", relativePath)?.params;
  if (params) {
    return [
      item(t("breadcrumbs.teachingClasses"), `${prefix}/classes`),
      item(
        labelOrFallback(context.classTitle, t("breadcrumbs.currentClass")),
        `${prefix}/class-sections/${params.id}`
      ),
      current(t("breadcrumbs.announcements")),
    ];
  }

  params = matchExact("/class-sections/:id/progress", relativePath)?.params;
  if (params) {
    return [
      item(t("breadcrumbs.teachingClasses"), `${prefix}/classes`),
      item(
        labelOrFallback(context.classTitle, t("breadcrumbs.currentClass")),
        `${prefix}/class-sections/${params.id}`
      ),
      current(t("breadcrumbs.progress")),
    ];
  }

  params = matchExact("/class-sections/:id/media", relativePath)?.params;
  if (params) {
    return [
      item(t("breadcrumbs.teachingClasses"), `${prefix}/classes`),
      item(
        labelOrFallback(context.classTitle, t("breadcrumbs.currentClass")),
        `${prefix}/class-sections/${params.id}`
      ),
      current(t("breadcrumbs.classMedia")),
    ];
  }

  params = matchExact("/class-sections/:classSectionId/quizzes/:quizId/attempts", relativePath)?.params;
  if (params) {
    return [
      item(t("breadcrumbs.teachingClasses"), `${prefix}/classes`),
      item(
        labelOrFallback(context.classTitle, t("breadcrumbs.currentClass")),
        `${prefix}/class-sections/${params.classSectionId}/review`
      ),
      item(t("breadcrumbs.quizzes")),
      current(labelOrFallback(context.quizTitle, t("breadcrumbs.currentQuiz"))),
    ];
  }

  params = matchExact("/quiz-attempts/:attemptId", relativePath)?.params;
  if (params) {
    const items = [item(t("breadcrumbs.teachingClasses"), `${prefix}/classes`)];
    if (context.classTitle && context.classSectionId) {
      items.push(item(context.classTitle, `${prefix}/class-sections/${context.classSectionId}/review`));
    }
    if (context.quizTitle) {
      items.push(item(t("breadcrumbs.quizzes")));
      items.push(item(context.quizTitle));
    }
    items.push(current(labelOrFallback(context.attemptTitle, `${t("breadcrumbs.attempt")} #${params.attemptId}`)));
    return items;
  }

  params = matchExact("/class-sections/:classSectionId/assignments/:assignmentId/submissions", relativePath)?.params;
  if (params) {
    return [
      item(t("breadcrumbs.teachingClasses"), `${prefix}/classes`),
      item(
        labelOrFallback(context.classTitle, t("breadcrumbs.currentClass")),
        `${prefix}/class-sections/${params.classSectionId}/review`
      ),
      item(t("breadcrumbs.assignments")),
      item(labelOrFallback(context.assignmentTitle, t("breadcrumbs.currentAssignment"))),
      current(t("breadcrumbs.submissions")),
    ];
  }

  return [];
}

function buildWorkspaceBreadcrumb(pathname, context, t) {
  const workspace = pathname.startsWith("/admin") ? "admin" : "teacher";
  const prefix = `/${workspace}`;
  const relativePath = pathname.slice(prefix.length) || "/";
  let params = null;

  if (matchExact("/dashboard", relativePath)) {
    return [current(t("breadcrumbs.dashboard"))];
  }

  if (matchExact("/report", relativePath) || matchExact("/reports", relativePath)) {
    return [current(t("breadcrumbs.reports"))];
  }

  if (matchExact("/announcements", relativePath)) {
    return [current(t("breadcrumbs.announcements"))];
  }

  if (matchExact("/quiz-attempts", relativePath)) {
    return [current(t("breadcrumbs.quizAttempts"))];
  }

  params = matchExact("/quiz-attempts/:attemptId", relativePath)?.params;
  if (params) {
    if (context.classTitle && context.classSectionId && context.quizTitle) {
      return [
        item(t("breadcrumbs.classes"), `${prefix}/class-sections`),
        item(context.classTitle, `${prefix}/class-sections/${context.classSectionId}`),
        item(t("breadcrumbs.quizzes")),
        item(context.quizTitle),
        current(labelOrFallback(context.attemptTitle, `${t("breadcrumbs.attempt")} #${params.attemptId}`)),
      ];
    }
    return [
      item(t("breadcrumbs.quizAttempts"), `${prefix}/quiz-attempts`),
      current(labelOrFallback(context.attemptTitle, `${t("breadcrumbs.attempt")} #${params.attemptId}`)),
    ];
  }

  if (matchExact("/class-sections", relativePath)) {
    return [current(t("breadcrumbs.classes"))];
  }

  params = matchExact("/class-sections/:id", relativePath)?.params;
  if (params) {
    return [
      item(t("breadcrumbs.classes"), `${prefix}/class-sections`),
      current(labelOrFallback(context.classTitle, t("breadcrumbs.currentClass"))),
    ];
  }

  params = matchExact("/class-sections/:id/media", relativePath)?.params;
  if (params) {
    return [
      item(t("breadcrumbs.classes"), `${prefix}/class-sections`),
      item(
        labelOrFallback(context.classTitle, t("breadcrumbs.currentClass")),
        `${prefix}/class-sections/${params.id}`
      ),
      current(t("breadcrumbs.classMedia")),
    ];
  }

  params = matchExact("/class-sections/:classSectionId/lectures/:lectureId", relativePath)?.params;
  if (params) {
    return [
      item(t("breadcrumbs.classes"), `${prefix}/class-sections`),
      item(
        labelOrFallback(context.classTitle, t("breadcrumbs.currentClass")),
        `${prefix}/class-sections/${params.classSectionId}`
      ),
      item(t("breadcrumbs.lectures")),
      current(labelOrFallback(context.lectureTitle, t("breadcrumbs.currentLecture"))),
    ];
  }

  params = matchExact("/class-sections/:classSectionId/lectures/:lectureId/preview", relativePath)?.params;
  if (params) {
    return [
      item(t("breadcrumbs.classes"), `${prefix}/class-sections`),
      item(
        labelOrFallback(context.classTitle, t("breadcrumbs.currentClass")),
        `${prefix}/class-sections/${params.classSectionId}`
      ),
      item(t("breadcrumbs.lectures")),
      item(labelOrFallback(context.lectureTitle, t("breadcrumbs.currentLecture"))),
      current(t("breadcrumbs.preview")),
    ];
  }

  params = matchExact("/class-sections/:classSectionId/chapters/:chapterId/lectures/create", relativePath)?.params;
  if (params) {
    const items = [
      item(t("breadcrumbs.classes"), `${prefix}/class-sections`),
      item(
        labelOrFallback(context.classTitle, t("breadcrumbs.currentClass")),
        `${prefix}/class-sections/${params.classSectionId}`
      ),
    ];
    if (context.chapterTitle) {
      items.push(item(context.chapterTitle));
    }
    items.push(current(t("breadcrumbs.createLecture")));
    return items;
  }

  params = matchExact("/class-sections/:classSectionId/quizzes/:quizId", relativePath)?.params;
  if (params) {
    return [
      item(t("breadcrumbs.classes"), `${prefix}/class-sections`),
      item(
        labelOrFallback(context.classTitle, t("breadcrumbs.currentClass")),
        `${prefix}/class-sections/${params.classSectionId}`
      ),
      item(t("breadcrumbs.quizzes")),
      current(labelOrFallback(context.quizTitle, t("breadcrumbs.currentQuiz"))),
    ];
  }

  params = matchExact("/class-sections/:classSectionId/chapters/:chapterId/quizzes/create", relativePath)?.params;
  if (params) {
    const items = [
      item(t("breadcrumbs.classes"), `${prefix}/class-sections`),
      item(
        labelOrFallback(context.classTitle, t("breadcrumbs.currentClass")),
        `${prefix}/class-sections/${params.classSectionId}`
      ),
    ];
    if (context.chapterTitle) {
      items.push(item(context.chapterTitle));
    }
    items.push(current(t("breadcrumbs.createQuiz")));
    return items;
  }

  params = matchExact("/class-sections/:classSectionId/quizzes/:quizId/preview", relativePath)?.params;
  if (params) {
    return [
      item(t("breadcrumbs.classes"), `${prefix}/class-sections`),
      item(
        labelOrFallback(context.classTitle, t("breadcrumbs.currentClass")),
        `${prefix}/class-sections/${params.classSectionId}`
      ),
      item(t("breadcrumbs.quizzes")),
      item(labelOrFallback(context.quizTitle, t("breadcrumbs.currentQuiz"))),
      current(t("breadcrumbs.preview")),
    ];
  }

  params = matchExact("/class-sections/:classSectionId/quizzes/:quizId/preview/attempt", relativePath)?.params;
  if (params) {
    return [
      item(t("breadcrumbs.classes"), `${prefix}/class-sections`),
      item(
        labelOrFallback(context.classTitle, t("breadcrumbs.currentClass")),
        `${prefix}/class-sections/${params.classSectionId}`
      ),
      item(t("breadcrumbs.quizzes")),
      item(labelOrFallback(context.quizTitle, t("breadcrumbs.currentQuiz"))),
      item(t("breadcrumbs.preview")),
      current(t("breadcrumbs.attempt")),
    ];
  }

  params = matchExact("/class-sections/:classSectionId/quizzes/:quizId/preview/result", relativePath)?.params;
  if (params) {
    return [
      item(t("breadcrumbs.classes"), `${prefix}/class-sections`),
      item(
        labelOrFallback(context.classTitle, t("breadcrumbs.currentClass")),
        `${prefix}/class-sections/${params.classSectionId}`
      ),
      item(t("breadcrumbs.quizzes")),
      item(labelOrFallback(context.quizTitle, t("breadcrumbs.currentQuiz"))),
      item(t("breadcrumbs.preview")),
      current(t("breadcrumbs.result")),
    ];
  }

  params = matchExact("/class-sections/:classSectionId/assignments/:assignmentId", relativePath)?.params;
  if (params) {
    return [
      item(t("breadcrumbs.classes"), `${prefix}/class-sections`),
      item(
        labelOrFallback(context.classTitle, t("breadcrumbs.currentClass")),
        `${prefix}/class-sections/${params.classSectionId}`
      ),
      item(t("breadcrumbs.assignments")),
      current(labelOrFallback(context.assignmentTitle, t("breadcrumbs.currentAssignment"))),
    ];
  }

  params = matchExact("/class-sections/:classSectionId/chapters/:chapterId/assignments/create", relativePath)?.params;
  if (params) {
    const items = [
      item(t("breadcrumbs.classes"), `${prefix}/class-sections`),
      item(
        labelOrFallback(context.classTitle, t("breadcrumbs.currentClass")),
        `${prefix}/class-sections/${params.classSectionId}`
      ),
    ];
    if (context.chapterTitle) {
      items.push(item(context.chapterTitle));
    }
    items.push(current(t("breadcrumbs.createAssignment")));
    return items;
  }

  params = matchExact("/class-sections/:classSectionId/assignments/:assignmentId/submissions", relativePath)?.params;
  if (params) {
    return [
      item(t("breadcrumbs.classes"), `${prefix}/class-sections`),
      item(
        labelOrFallback(context.classTitle, t("breadcrumbs.currentClass")),
        `${prefix}/class-sections/${params.classSectionId}`
      ),
      item(t("breadcrumbs.assignments")),
      item(labelOrFallback(context.assignmentTitle, t("breadcrumbs.currentAssignment"))),
      current(t("breadcrumbs.submissions")),
    ];
  }

  params = matchExact("/class-sections/:classSectionId/assignments/:assignmentId/preview", relativePath)?.params;
  if (params) {
    return [
      item(t("breadcrumbs.classes"), `${prefix}/class-sections`),
      item(
        labelOrFallback(context.classTitle, t("breadcrumbs.currentClass")),
        `${prefix}/class-sections/${params.classSectionId}`
      ),
      item(t("breadcrumbs.assignments")),
      item(labelOrFallback(context.assignmentTitle, t("breadcrumbs.currentAssignment"))),
      current(t("breadcrumbs.preview")),
    ];
  }

  if (matchExact("/curriculums", relativePath)) {
    return [current(t("breadcrumbs.curriculums"))];
  }

  if (matchExact("/curriculums/create", relativePath)) {
    return [item(t("breadcrumbs.curriculums"), `${prefix}/curriculums`), current(t("breadcrumbs.create"))];
  }

  params = matchExact("/curriculums/edit/:id", relativePath)?.params;
  if (params) {
    return [
      item(t("breadcrumbs.curriculums"), `${prefix}/curriculums`),
      item(labelOrFallback(context.templateName, t("breadcrumbs.currentCurriculum")), `${prefix}/curriculums/${params.id}`),
      current(t("breadcrumbs.edit")),
    ];
  }

  params = matchExact("/curriculums/:id", relativePath)?.params;
  if (params) {
    return [
      item(t("breadcrumbs.curriculums"), `${prefix}/curriculums`),
      current(labelOrFallback(context.templateName, t("breadcrumbs.currentCurriculum"))),
    ];
  }

  params = matchExact("/curriculums/:templateId/chapters/create", relativePath)?.params;
  if (params) {
    return [
      item(t("breadcrumbs.curriculums"), `${prefix}/curriculums`),
      item(
        labelOrFallback(context.templateName, t("breadcrumbs.currentCurriculum")),
        `${prefix}/curriculums/${params.templateId}`
      ),
      current(t("breadcrumbs.createChapter")),
    ];
  }

  params = matchExact("/curriculums/:templateId/lectures/create", relativePath)?.params;
  if (params) {
    return [
      item(t("breadcrumbs.curriculums"), `${prefix}/curriculums`),
      item(
        labelOrFallback(context.templateName, t("breadcrumbs.currentCurriculum")),
        `${prefix}/curriculums/${params.templateId}`
      ),
      current(t("breadcrumbs.createLecture")),
    ];
  }

  params = matchExact("/curriculums/:templateId/chapters/:chapterId/lectures/create", relativePath)?.params;
  if (params) {
    const items = [
      item(t("breadcrumbs.curriculums"), `${prefix}/curriculums`),
      item(
        labelOrFallback(context.templateName, t("breadcrumbs.currentCurriculum")),
        `${prefix}/curriculums/${params.templateId}`
      ),
    ];
    if (context.chapterTitle) {
      items.push(item(context.chapterTitle));
    }
    items.push(current(t("breadcrumbs.createLecture")));
    return items;
  }

  params = matchExact("/curriculums/:templateId/lectures/:lectureId", relativePath)?.params;
  if (params) {
    return [
      item(t("breadcrumbs.curriculums"), `${prefix}/curriculums`),
      item(
        labelOrFallback(context.templateName, t("breadcrumbs.currentCurriculum")),
        `${prefix}/curriculums/${params.templateId}`
      ),
      item(t("breadcrumbs.lectures")),
      current(labelOrFallback(context.lectureTitle, t("breadcrumbs.currentLecture"))),
    ];
  }

  params = matchExact("/curriculums/:templateId/quizzes/create", relativePath)?.params;
  if (params) {
    return [
      item(t("breadcrumbs.curriculums"), `${prefix}/curriculums`),
      item(
        labelOrFallback(context.templateName, t("breadcrumbs.currentCurriculum")),
        `${prefix}/curriculums/${params.templateId}`
      ),
      current(t("breadcrumbs.createQuiz")),
    ];
  }

  params = matchExact("/curriculums/:templateId/chapters/:chapterId/quizzes/create", relativePath)?.params;
  if (params) {
    const items = [
      item(t("breadcrumbs.curriculums"), `${prefix}/curriculums`),
      item(
        labelOrFallback(context.templateName, t("breadcrumbs.currentCurriculum")),
        `${prefix}/curriculums/${params.templateId}`
      ),
    ];
    if (context.chapterTitle) {
      items.push(item(context.chapterTitle));
    }
    items.push(current(t("breadcrumbs.createQuiz")));
    return items;
  }

  params = matchExact("/curriculums/:templateId/quizzes/:quizId", relativePath)?.params;
  if (params) {
    return [
      item(t("breadcrumbs.curriculums"), `${prefix}/curriculums`),
      item(
        labelOrFallback(context.templateName, t("breadcrumbs.currentCurriculum")),
        `${prefix}/curriculums/${params.templateId}`
      ),
      item(t("breadcrumbs.quizzes")),
      current(labelOrFallback(context.quizTitle, t("breadcrumbs.currentQuiz"))),
    ];
  }

  params = matchExact("/curriculums/:templateId/quizzes/:quizId/preview", relativePath)?.params;
  if (params) {
    return [
      item(t("breadcrumbs.curriculums"), `${prefix}/curriculums`),
      item(
        labelOrFallback(context.templateName, t("breadcrumbs.currentCurriculum")),
        `${prefix}/curriculums/${params.templateId}`
      ),
      item(t("breadcrumbs.quizzes")),
      item(labelOrFallback(context.quizTitle, t("breadcrumbs.currentQuiz"))),
      current(t("breadcrumbs.preview")),
    ];
  }

  params = matchExact("/curriculums/:templateId/quizzes/:quizId/preview/attempt", relativePath)?.params;
  if (params) {
    return [
      item(t("breadcrumbs.curriculums"), `${prefix}/curriculums`),
      item(
        labelOrFallback(context.templateName, t("breadcrumbs.currentCurriculum")),
        `${prefix}/curriculums/${params.templateId}`
      ),
      item(t("breadcrumbs.quizzes")),
      item(labelOrFallback(context.quizTitle, t("breadcrumbs.currentQuiz"))),
      item(t("breadcrumbs.preview")),
      current(t("breadcrumbs.attempt")),
    ];
  }

  params = matchExact("/curriculums/:templateId/quizzes/:quizId/preview/result", relativePath)?.params;
  if (params) {
    return [
      item(t("breadcrumbs.curriculums"), `${prefix}/curriculums`),
      item(
        labelOrFallback(context.templateName, t("breadcrumbs.currentCurriculum")),
        `${prefix}/curriculums/${params.templateId}`
      ),
      item(t("breadcrumbs.quizzes")),
      item(labelOrFallback(context.quizTitle, t("breadcrumbs.currentQuiz"))),
      item(t("breadcrumbs.preview")),
      current(t("breadcrumbs.result")),
    ];
  }

  if (matchExact("/question-banks", relativePath)) {
    return [current(t("breadcrumbs.questionBanks"))];
  }

  params = matchExact("/question-banks/:id", relativePath)?.params;
  if (params) {
    return [
      item(t("breadcrumbs.questionBanks"), `${prefix}/question-banks`),
      current(labelOrFallback(context.questionBankName, t("breadcrumbs.currentQuestionBank"))),
    ];
  }

  params = matchExact("/question-banks/:id/media", relativePath)?.params;
  if (params) {
    return [
      item(t("breadcrumbs.questionBanks"), `${prefix}/question-banks`),
      item(
        labelOrFallback(context.questionBankName, t("breadcrumbs.currentQuestionBank")),
        `${prefix}/question-banks/${params.id}`
      ),
      current(t("breadcrumbs.media")),
    ];
  }

  if (matchExact("/students", relativePath)) {
    return [current(t("breadcrumbs.students"))];
  }

  if (matchExact("/profile", relativePath)) {
    return [current(t("breadcrumbs.profile"))];
  }

  if (matchExact("/settings", relativePath)) {
    return [current(t("breadcrumbs.settings"))];
  }

  if (matchExact("/media", relativePath)) {
    return [current(t("breadcrumbs.media"))];
  }

  if (matchExact("/assignments", relativePath)) {
    return [current(t("breadcrumbs.assignments"))];
  }

  if (workspace === "admin" && matchExact("/users", relativePath)) {
    return [current(t("breadcrumbs.users"))];
  }

  if (workspace === "admin" && matchExact("/categories", relativePath)) {
    return [current(t("breadcrumbs.categories"))];
  }

  if (workspace === "admin" && matchExact("/subjects", relativePath)) {
    return [current(t("breadcrumbs.subjects"))];
  }

  return [];
}

function resolveBreadcrumbs(pathname, context, t) {
  if (pathname.startsWith("/teacher") || pathname.startsWith("/admin")) {
    return buildWorkspaceBreadcrumb(pathname, context, t);
  }
  if (pathname.startsWith("/teaching")) {
    return buildTeachingBreadcrumb(pathname, context, t);
  }
  return buildStudentBreadcrumb(pathname, context, t);
}

export default function AppBreadcrumb({ context = {}, className = "", hideSingle = true }) {
  const location = useLocation();
  const { t } = useTranslation();
  const items = resolveBreadcrumbs(location.pathname, context, t);

  if (!items.length || (hideSingle && items.length <= 1)) {
    return null;
  }

  return (
    <nav
      aria-label={t("breadcrumbs.ariaLabel")}
      className={`overflow-x-auto pb-1 ${className}`}
    >
      <ol className="flex min-w-max items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        {items.map((crumb, index) => (
          <React.Fragment key={`${crumb.label}-${index}`}>
            {index > 0 && <span className="shrink-0 text-slate-300 dark:text-slate-600">/</span>}
            {crumb.to && !crumb.current ? (
              <li className="shrink-0">
                <Link className="font-medium text-primary hover:underline" to={crumb.to}>
                  {crumb.label}
                </Link>
              </li>
            ) : (
              <li
                className={`truncate ${crumb.current ? "font-semibold text-slate-700 dark:text-slate-200" : ""}`}
              >
                {crumb.label}
              </li>
            )}
          </React.Fragment>
        ))}
      </ol>
    </nav>
  );
}
