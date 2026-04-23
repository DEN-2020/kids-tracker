import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db } from "../db";
import { doc, updateDoc } from "firebase/firestore";

const AVATAR_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

const AVATAR_ALLOWED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
] as const;

export const AVATAR_MAX_SIZE_BYTES = 5 * 1024 * 1024;
export const AVATAR_FILE_ACCEPT = [
  ...AVATAR_ALLOWED_EXTENSIONS,
  ...AVATAR_ALLOWED_MIME_TYPES,
].join(",");

export type AvatarUploadValidationErrorCode = "invalid-type" | "file-too-large";

export class AvatarUploadValidationError extends Error {
  readonly code: AvatarUploadValidationErrorCode;

  constructor(code: AvatarUploadValidationErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "AvatarUploadValidationError";
  }
}

const getAvatarFileExtension = (fileName: string) => {
  const lastDotIndex = fileName.lastIndexOf(".");
  return lastDotIndex >= 0 ? fileName.slice(lastDotIndex).toLowerCase() : "";
};

export const validateAvatarFile = (file: File) => {
  const extension = getAvatarFileExtension(file.name);
  const hasAllowedExtension = AVATAR_ALLOWED_EXTENSIONS.includes(
    extension as (typeof AVATAR_ALLOWED_EXTENSIONS)[number],
  );
  const hasAllowedMimeType =
    !file.type ||
    AVATAR_ALLOWED_MIME_TYPES.includes(
      file.type as (typeof AVATAR_ALLOWED_MIME_TYPES)[number],
    );

  if (!hasAllowedExtension || !hasAllowedMimeType) {
    throw new AvatarUploadValidationError(
      "invalid-type",
      "Unsupported avatar format. Use JPG, PNG, WEBP, or GIF.",
    );
  }

  if (file.size > AVATAR_MAX_SIZE_BYTES) {
    throw new AvatarUploadValidationError(
      "file-too-large",
      "Avatar file is too large. Maximum size is 5 MB.",
    );
  }
};

export const uploadAvatar = async (uid: string, file: File) => {
  validateAvatarFile(file);

  const storage = getStorage();
  const storageRef = ref(storage, `avatars/${uid}`);
  await uploadBytes(storageRef, file, {
    contentType: file.type || undefined,
  });

  const photoURL = await getDownloadURL(storageRef);
  await updateDoc(doc(db, "users", uid), { avatar: photoURL });
  return photoURL;
};
