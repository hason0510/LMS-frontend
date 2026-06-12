import React from "react";
import Avatar from "./Avatar";
import { resolveUserIdentity } from "../../utils/userIdentity";

export default function UserIdentity({
  user,
  variant = "auto",
  className = "",
  showAvatar = true,
  showText = true,
  avatarSizeClass = "size-10",
  avatarClassName = "",
  avatarInitialsClass = "text-base",
  fallbackName = "Người dùng",
  nameClassName = "m-0 truncate text-sm font-semibold text-slate-900 dark:text-white",
  secondaryClassName = "m-0 mt-1 truncate text-xs text-slate-500 dark:text-slate-400",
  secondaryText,
}) {
  const identity = resolveUserIdentity(user, { variant, fallbackName });
  const resolvedSecondaryText = secondaryText !== undefined ? secondaryText : identity.secondaryText;

  return (
    <div className={`flex min-w-0 items-center gap-3 ${className}`.trim()}>
      {showAvatar ? (
        <Avatar
          src={identity.avatarUrl}
          alt={identity.name}
          sizeClass={avatarSizeClass}
          initialsClass={avatarInitialsClass}
          className={avatarClassName}
        />
      ) : null}
      {showText ? (
        <div className="min-w-0">
          <p className={nameClassName}>{identity.name}</p>
          {resolvedSecondaryText ? (
            <p className={secondaryClassName}>{resolvedSecondaryText}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
