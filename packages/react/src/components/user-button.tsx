"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
  type KeyboardEvent,
} from "react";
import { useUser } from "../hooks/use-user";
import { useAuth } from "../hooks/use-auth";

interface UserButtonMenuItem {
  label: string;
  onClick: () => void;
}

interface UserButtonProps {
  afterSignOutUrl?: string;
  showName?: boolean;
  menuItems?: UserButtonMenuItem[];
  appearance?: {
    buttonSize?: number;
    buttonBg?: string;
    menuBg?: string;
    menuBorder?: string;
  };
}

export function UserButton({
  afterSignOutUrl,
  showName = false,
  menuItems = [],
  appearance = {},
}: UserButtonProps = {}) {
  const { user } = useUser();
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const {
    buttonSize = 36,
    buttonBg = "#2563eb",
    menuBg = "#1a1a1a",
    menuBorder = "#333",
  } = appearance;

  const close = useCallback(() => {
    setOpen(false);
    buttonRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (open && menuRef.current) {
      const firstItem =
        menuRef.current.querySelector<HTMLElement>('[role="menuitem"]');
      firstItem?.focus();
    }
  }, [open]);

  const handleMenuKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const items =
          menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]');
        if (!items?.length) return;
        const current = document.activeElement;
        const idx = Array.from(items).indexOf(current as HTMLElement);
        const next =
          e.key === "ArrowDown"
            ? items[(idx + 1) % items.length]
            : items[(idx - 1 + items.length) % items.length];
        next?.focus();
      }

      if (e.key === "Tab") {
        e.preventDefault();
        close();
      }
    },
    [close],
  );

  if (!user) return null;

  const initials =
    (user.firstName?.[0] ?? "") + (user.lastName?.[0] ?? "") ||
    user.email[0].toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    if (afterSignOutUrl) window.location.href = afterSignOutUrl;
  };

  const allItems: UserButtonMenuItem[] = [
    ...menuItems,
    { label: "Sign out", onClick: handleSignOut },
  ];

  return (
    <div
      ref={ref}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      {showName && user.firstName && (
        <span style={{ color: "#fff", fontSize: 14 }}>
          {user.firstName} {user.lastName}
        </span>
      )}
      <button
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        aria-label="User menu"
        aria-expanded={open}
        aria-haspopup="menu"
        style={{
          width: buttonSize,
          height: buttonSize,
          borderRadius: "50%",
          border: `1px solid ${menuBorder}`,
          background: user.avatarUrl
            ? `url(${user.avatarUrl}) center/cover`
            : buttonBg,
          color: "#fff",
          cursor: "pointer",
          fontSize: 14,
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {!user.avatarUrl && initials}
      </button>
      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="User menu"
          onKeyDown={handleMenuKeyDown}
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 4px)",
            background: menuBg,
            border: `1px solid ${menuBorder}`,
            borderRadius: 8,
            padding: 8,
            minWidth: 200,
            zIndex: 50,
          }}
        >
          <div
            style={{
              padding: "8px 12px",
              borderBottom: `1px solid ${menuBorder}`,
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 14, color: "#fff" }}>
              {user.firstName} {user.lastName}
            </div>
            <div style={{ fontSize: 12, color: "#888" }}>{user.email}</div>
          </div>
          {allItems.map((item, i) => (
            <button
              key={i}
              role="menuitem"
              tabIndex={-1}
              onClick={item.onClick}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  item.onClick();
                }
              }}
              style={{
                width: "100%",
                padding: "8px 12px",
                background: "none",
                border: "none",
                color: item.label === "Sign out" ? "#ef4444" : "#fff",
                cursor: "pointer",
                textAlign: "left",
                fontSize: 14,
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
