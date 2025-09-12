// Prefix public asset paths with the app base so they work under subpaths (e.g. GitHub Pages, PWA scope)
const BASE_URL: string = (import.meta as any).env?.BASE_URL || '/';

const DEFAULT_AVATAR_FILENAMES: string[] = [
  'avatar-01.svg',
  'avatar-02.svg',
  'avatar-03.svg',
  'avatar-04.svg',
  'avatar-05.svg',
  'avatar-06.svg',
  'avatar-07.svg',
  'avatar-08.svg',
  'avatar-09.svg',
  'avatar-10.svg',
];

export const DEFAULT_AVATARS: string[] = DEFAULT_AVATAR_FILENAMES.map(
  (name) => `${BASE_URL}avatars/defaults/${name}`
);

export function isDefaultAvatar(url: string | null | undefined): boolean {
  if (!url) return false;
  // Check by filename so it works regardless of base URL or absolute origin
  return DEFAULT_AVATAR_FILENAMES.some((name) => url.endsWith(name));
}
