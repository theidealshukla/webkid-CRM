"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Shared hook for loading user avatars from localStorage.
 * Eliminates duplicate avatar logic across Sidebar, Topbar, and Settings.
 */
export function useAvatar(userId: string | undefined) {
  const [avatar, setAvatar] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!userId) return;

    const loadAvatar = () => {
      const saved = localStorage.getItem(`avatar_${userId}`);
      setAvatar(saved);
    };

    loadAvatar();
    window.addEventListener("avatarUpdated", loadAvatar);
    return () => window.removeEventListener("avatarUpdated", loadAvatar);
  }, [userId]);

  const uploadAvatar = useCallback(
    (file: File) => {
      if (!userId) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_SIZE = 120;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);

          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
          setAvatar(dataUrl);
          localStorage.setItem(`avatar_${userId}`, dataUrl);
          window.dispatchEvent(new Event("avatarUpdated"));
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    },
    [userId]
  );

  const initials = (name?: string) =>
    name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "U";

  return { avatar, uploadAvatar, fileInputRef, initials };
}
