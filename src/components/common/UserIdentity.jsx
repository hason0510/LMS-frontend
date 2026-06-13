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
  nameClassName = "m-0 truncate text-sm font-semibold leading-tight text-slate-900 dark:text-white",
  secondaryClassName = "m-0 truncate text-xs leading-tight text-slate-500 dark:text-slate-400",
  secondaryText,
  appendNameNode,
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
        <div className="min-w-0 flex flex-col justify-center">
          <div className="flex items-center gap-2 min-w-0">
            <div className={nameClassName}>{identity.name}</div>
            {appendNameNode && <div className="shrink-0">{appendNameNode}</div>}
          </div>
          {resolvedSecondaryText ? (
            <div className={`${secondaryClassName} !mt-0.5`}>{resolvedSecondaryText}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
