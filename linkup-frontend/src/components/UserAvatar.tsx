import { avatarThumb } from '../lib/api';

function initials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

interface UserAvatarProps {
  avatar?: string | null;
  name: string;
  size?: number; // px, used for Cloudinary crop — default 80
  className?: string; // applied to the wrapper div
}

/**
 * Renders a circular avatar: photo if a URL exists, initials otherwise.
 * Always wrap in a sized container with overflow-hidden.
 */
export function UserAvatar({ avatar, name, size = 80, className = '' }: UserAvatarProps) {
  const thumb = avatarThumb(avatar, size);
  if (thumb) {
    return (
      <img
        src={thumb}
        alt={name}
        className={`w-full h-full object-cover rounded-full ${className}`}
      />
    );
  }
  return <>{initials(name)}</>;
}
