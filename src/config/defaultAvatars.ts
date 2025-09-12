export const DEFAULT_AVATARS: string[] = [
  '/avatars/defaults/avatar-01.svg',
  '/avatars/defaults/avatar-02.svg',
  '/avatars/defaults/avatar-03.svg',
  '/avatars/defaults/avatar-04.svg',
  '/avatars/defaults/avatar-05.svg',
  '/avatars/defaults/avatar-06.svg',
  '/avatars/defaults/avatar-07.svg',
  '/avatars/defaults/avatar-08.svg',
  '/avatars/defaults/avatar-09.svg',
  '/avatars/defaults/avatar-10.svg',
];

export function isDefaultAvatar(url: string | null | undefined): boolean {
  if (!url) return false;
  return DEFAULT_AVATARS.some((path) => url.endsWith(path));
}
