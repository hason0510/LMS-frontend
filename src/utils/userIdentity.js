export function getUserDisplayName(user, fallback = "Người dùng") {
  if (!user) {
    return fallback;
  }

  return (
    user.fullName ||
    user.name ||
    user.studentName ||
    user.teacherName ||
    user.userName ||
    user.username ||
    user.gmail ||
    user.email ||
    fallback
  );
}

export function getUserAvatarUrl(user) {
  if (!user) {
    return null;
  }

  return (
    user.imageUrl ||
    user.avatarUrl ||
    user.studentAvatar ||
    user.avatar ||
    user.profilePicture ||
    user.image_url ||
    null
  );
}

export function getUserEmail(user) {
  if (!user) {
    return null;
  }

  return user.gmail || user.email || null;
}

export function getUserStudentNumber(user) {
  if (!user) {
    return null;
  }

  return user.studentNumber || null;
}

export function resolveUserVariant(user, preferredVariant = "auto") {
  if (preferredVariant !== "auto") {
    return preferredVariant;
  }

  const role = user?.role || user?.roleName || null;
  if (role === "STUDENT") {
    return "student";
  }

  if (role === "TEACHER" || role === "ADMIN") {
    return "teacher";
  }

  return getUserStudentNumber(user) ? "student" : "teacher";
}

export function getUserSecondaryText(user, preferredVariant = "auto") {
  const variant = resolveUserVariant(user, preferredVariant);
  const studentNumber = getUserStudentNumber(user);
  const email = getUserEmail(user);

  if (variant === "student") {
    return studentNumber || email || null;
  }

  return email || null;
}

export function resolveUserIdentity(user, options = {}) {
  const { variant = "auto", fallbackName = "Người dùng" } = options;

  return {
    name: getUserDisplayName(user, fallbackName),
    avatarUrl: getUserAvatarUrl(user),
    secondaryText: getUserSecondaryText(user, variant),
    variant: resolveUserVariant(user, variant),
  };
}
