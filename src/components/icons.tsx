import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 16, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconDashboard = (p: IconProps) => (
  <Icon {...p}><rect x="3" y="3" width="7" height="8" rx="1.6" /><rect x="14" y="3" width="7" height="5" rx="1.6" /><rect x="14" y="11" width="7" height="10" rx="1.6" /><rect x="3" y="14" width="7" height="7" rx="1.6" /></Icon>
);
export const IconStudents = (p: IconProps) => (
  <Icon {...p}><path d="M12 3 2.5 7.5 12 12l9.5-4.5L12 3Z" /><path d="M6.5 10v5.2c0 1.6 2.5 2.9 5.5 2.9s5.5-1.3 5.5-2.9V10" /><path d="M21 8v6" /></Icon>
);
export const IconApplications = (p: IconProps) => (
  <Icon {...p}><rect x="3" y="3" width="6" height="18" rx="1.6" /><rect x="11" y="3" width="6" height="12" rx="1.6" /><path d="M19 3h2v8h-2z" opacity="0.5" /></Icon>
);
export const IconUniversity = (p: IconProps) => (
  <Icon {...p}><path d="M3 10.5 12 5l9 5.5" /><path d="M5 11v8" /><path d="M9.5 11v8" /><path d="M14.5 11v8" /><path d="M19 11v8" /><path d="M3 21h18" /></Icon>
);
export const IconDocuments = (p: IconProps) => (
  <Icon {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" /><path d="M14 3v5h5" /><path d="M9 13h6" /><path d="M9 17h4" /></Icon>
);
export const IconTasks = (p: IconProps) => (
  <Icon {...p}><rect x="3" y="4" width="18" height="17" rx="2.4" /><path d="M8 3v3" /><path d="M16 3v3" /><path d="m8.5 13.5 2 2 4.5-4.5" /></Icon>
);
export const IconDeadline = (p: IconProps) => (
  <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7.5V12l3 2" /></Icon>
);
export const IconTeam = (p: IconProps) => (
  <Icon {...p}><circle cx="9" cy="8" r="3.2" /><path d="M2.8 20c.6-3.2 3.2-5 6.2-5s5.6 1.8 6.2 5" /><path d="M16.5 5.2a3.2 3.2 0 0 1 0 6" /><path d="M18 14.6c2.1.5 3.6 2.1 4 5" /></Icon>
);
export const IconFinance = (p: IconProps) => (
  <Icon {...p}><rect x="2.5" y="5.5" width="19" height="13" rx="2.4" /><path d="M2.5 10h19" /><path d="M6.5 14.5h3" /></Icon>
);
export const IconSettings = (p: IconProps) => (
  <Icon {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 14.5a1.6 1.6 0 0 0 .32 1.77l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-.97 1.46V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.77.32l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.6 1.6 0 0 0 4.6 15a1.6 1.6 0 0 0-1.46-.97H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.32-1.77l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.6 1.6 0 0 0 9 4.6a1.6 1.6 0 0 0 .97-1.46V3a2 2 0 1 1 4 0v.1A1.6 1.6 0 0 0 15 4.6a1.6 1.6 0 0 0 1.77-.32l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.6 1.6 0 0 0 19.4 9v.03a1.6 1.6 0 0 0 1.46.97H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5.5Z" /></Icon>
);
export const IconBoard = (p: IconProps) => (
  <Icon {...p}><rect x="3" y="4" width="6" height="16" rx="1.6" /><rect x="11" y="4" width="6" height="10" rx="1.6" /></Icon>
);
export const IconList = (p: IconProps) => (
  <Icon {...p}><path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" /><path d="M3.5 6h.01" /><path d="M3.5 12h.01" /><path d="M3.5 18h.01" /></Icon>
);
export const IconPencil = (p: IconProps) => (
  <Icon {...p}><path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3Z" /><path d="M14.5 6.5 17.5 9.5" /></Icon>
);
export const IconClose = (p: IconProps) => (
  <Icon {...p}><path d="m6 6 12 12" /><path d="m18 6-12 12" /></Icon>
);
export const IconLock = (p: IconProps) => (
  <Icon {...p}><rect x="4" y="10.5" width="16" height="10.5" rx="2.4" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /><path d="M12 15v2" /></Icon>
);
export const IconUnlock = (p: IconProps) => (
  <Icon {...p}><rect x="4" y="10.5" width="16" height="10.5" rx="2.4" /><path d="M8 10.5V7.5a4 4 0 0 1 7.5-2" /><path d="M12 15v2" /></Icon>
);
export const IconLogout = (p: IconProps) => (
  <Icon {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></Icon>
);
export const IconPin = (p: IconProps) => (
  <Icon {...p}><path d="M14.5 3.5 20.5 9.5" /><path d="M16.5 5.5 12 10l-4.5 1.5L5 14l5 5 2.5-2.5L14 12l4.5-4.5" /><path d="m5 19-2.5 2.5" /></Icon>
);
export const IconPanel = (p: IconProps) => (
  <Icon {...p}><rect x="3" y="4" width="18" height="16" rx="2.4" /><path d="M9.5 4v16" /></Icon>
);
export const IconDrag = (p: IconProps) => (
  <Icon {...p}><circle cx="9" cy="6" r="1.4" fill="currentColor" stroke="none" /><circle cx="15" cy="6" r="1.4" fill="currentColor" stroke="none" /><circle cx="9" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="15" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="9" cy="18" r="1.4" fill="currentColor" stroke="none" /><circle cx="15" cy="18" r="1.4" fill="currentColor" stroke="none" /></Icon>
);
export const IconTrash = (p: IconProps) => (
  <Icon {...p}><path d="M4 6.5h16" /><path d="M9.5 6.5V4.8A1.3 1.3 0 0 1 10.8 3.5h2.4a1.3 1.3 0 0 1 1.3 1.3v1.7" /><path d="M6.5 6.5 7.4 20a1.4 1.4 0 0 0 1.4 1.3h6.4a1.4 1.4 0 0 0 1.4-1.3l.9-13.5" /><path d="M10.5 10.5v6.5" /><path d="M13.5 10.5v6.5" /></Icon>
);
export const IconEye = (p: IconProps) => (
  <Icon {...p}>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
);
export const IconEyeOff = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9.9 5.2A10.6 10.6 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3 3.9M6.6 6.6C3.7 8.4 2 12 2 12s3.6 7 10 7a10 10 0 0 0 4.2-.9" />
    <path d="M9.5 9.5a3 3 0 0 0 4.2 4.2" />
    <path d="M2 2l20 20" />
  </Icon>
);
export const IconArrowUp = (p: IconProps) => (
  <Icon {...p}><path d="M12 19V5" /><path d="m6 11 6-6 6 6" /></Icon>
);
export const IconArrowDown = (p: IconProps) => (
  <Icon {...p}><path d="M12 5v14" /><path d="m6 13 6 6 6-6" /></Icon>
);
export const IconCalendar = (p: IconProps) => (
  <Icon {...p}><rect x="3" y="5" width="18" height="16" rx="2.4" /><path d="M3 10h18" /><path d="M8 3v4" /><path d="M16 3v4" /></Icon>
);
export const IconPlay = (p: IconProps) => (
  <Icon {...p}><path d="M7 4.5 19 12 7 19.5V4.5Z" fill="currentColor" stroke="none" /></Icon>
);
export const IconPause = (p: IconProps) => (
  <Icon {...p}><rect x="6.5" y="4.5" width="4" height="15" rx="1.4" fill="currentColor" stroke="none" /><rect x="13.5" y="4.5" width="4" height="15" rx="1.4" fill="currentColor" stroke="none" /></Icon>
);
export const IconStop = (p: IconProps) => (
  <Icon {...p}><rect x="5.5" y="5.5" width="13" height="13" rx="2.4" fill="currentColor" stroke="none" /></Icon>
);
export const IconSun = (p: IconProps) => (
  <Icon {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6M18.7 18.7l-1.6-1.6M6.9 6.9 5.3 5.3" /></Icon>
);
export const IconMoon = (p: IconProps) => (
  <Icon {...p}><path d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.4 8.4 0 1 0 10.2 10.2Z" /></Icon>
);
export const IconInstagram = (p: IconProps) => (
  <Icon {...p}><rect x="3" y="3" width="18" height="18" rx="5.2" /><circle cx="12" cy="12" r="4" /><circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" /></Icon>
);
export const IconTelegram = (p: IconProps) => (
  <Icon {...p}><path d="M21 4.5 2.8 11.3c-.8.3-.8 1.4 0 1.7l4.6 1.5 1.7 5c.3.8 1.3 1 1.8.3l2.4-2.9 4.6 3.4c.6.5 1.5.1 1.7-.6L22 5.6c.2-.8-.4-1.4-1-1.1Z" /><path d="m7.4 14.5 10.2-7.6-7.5 8.5" /></Icon>
);
export const IconSearch = (p: IconProps) => (
  <Icon {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></Icon>
);
export const IconBell = (p: IconProps) => (
  <Icon {...p}><path d="M18 8.5a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16s-2-1.5-2-6.5Z" /><path d="M10.3 19a2 2 0 0 0 3.4 0" /></Icon>
);
export const IconMail = (p: IconProps) => (
  <Icon {...p}><rect x="2.5" y="5" width="19" height="14" rx="2.4" /><path d="m3.5 7 8.5 6 8.5-6" /></Icon>
);
export const IconChevron = (p: IconProps) => (
  <Icon {...p}><path d="m6 9 6 6 6-6" /></Icon>
);
export const IconChevronRight = (p: IconProps) => (
  <Icon {...p}><path d="m9 6 6 6-6 6" /></Icon>
);
export const IconPlus = (p: IconProps) => (
  <Icon {...p}><path d="M12 5v14" /><path d="M5 12h14" /></Icon>
);
export const IconFilter = (p: IconProps) => (
  <Icon {...p}><path d="M3 6h18" /><path d="M7 12h10" /><path d="M11 18h2" /></Icon>
);
export const IconExport = (p: IconProps) => (
  <Icon {...p}><path d="M12 15V3" /><path d="m8 7 4-4 4 4" /><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" /></Icon>
);
export const IconMore = (p: IconProps) => (
  <Icon {...p}><circle cx="12" cy="5" r="1.4" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="12" cy="19" r="1.4" fill="currentColor" stroke="none" /></Icon>
);
export const IconPhone = (p: IconProps) => (
  <Icon {...p}><path d="M6.5 3.5h3l1.5 4-2 1.4a12 12 0 0 0 6.1 6.1l1.4-2 4 1.5v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2Z" /></Icon>
);
export const IconGlobe = (p: IconProps) => (
  <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18Z" /></Icon>
);
export const IconCheck = (p: IconProps) => (
  <Icon {...p}><path d="m4.5 12.5 5 5 10-11" /></Icon>
);
export const IconAlert = (p: IconProps) => (
  <Icon {...p}><path d="M12 4.5 2.8 20h18.4L12 4.5Z" /><path d="M12 10v4" /><path d="M12 17.2h.01" /></Icon>
);
export const IconArrowUpRight = (p: IconProps) => (
  <Icon {...p}><path d="M7 17 17 7" /><path d="M8 7h9v9" /></Icon>
);
export const IconLogo = ({ size = 22, ...rest }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden {...rest}>
    <circle cx="12" cy="12" r="9.2" stroke="currentColor" strokeWidth="1.6" />
    <circle cx="12" cy="12" r="3.4" fill="currentColor" />
    <circle cx="19.6" cy="6.4" r="2.1" fill="currentColor" />
  </svg>
);
