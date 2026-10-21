import type { ReactNode, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

// Every icon is a 20×20 line drawing that takes the color of the surrounding text (currentColor).
function createIcon(paths: ReactNode) {
  return function Icon({ className = 'size-4.5', ...props }: IconProps) {
    return (
      <svg
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={className}
        {...props}
      >
        {paths}
      </svg>
    );
  };
}

export const HomeIcon = createIcon(
  <path d="M3 9.5 10 4l7 5.5V16a1 1 0 0 1-1 1h-3.5v-4.5h-5V17H4a1 1 0 0 1-1-1z" />
);
export const CareerIcon = createIcon(
  <>
    <path d="M10 2.5l6.5 3.75v7.5L10 17.5l-6.5-3.75v-7.5z" />
    <path d="M10 13.2V7.6M7.4 10.1 10 7.5l2.6 2.6" />
  </>
);
export const ProfileIcon = createIcon(
  <>
    <circle cx="10" cy="7" r="3" />
    <path d="M4 17c.8-3 3.2-4.5 6-4.5s5.2 1.5 6 4.5" />
  </>
);
export const ResumeIcon = createIcon(
  <>
    <rect x="4.5" y="2.8" width="11" height="14.4" rx="1.6" />
    <path d="M7.5 7h5M7.5 10h5M7.5 13h3" />
  </>
);
export const CertificationIcon = createIcon(
  <>
    <circle cx="10" cy="8" r="4.6" />
    <path d="M7.4 11.8 6.6 17.2l3.4-1.7 3.4 1.7-.8-5.4" />
  </>
);
export const CourseIcon = createIcon(
  <>
    <path d="M2.8 5.3c2.6-1 5-1 7.2.6 2.2-1.6 4.6-1.6 7.2-.6v10.6c-2.6-1-5-1-7.2.6-2.2-1.6-4.6-1.6-7.2-.6z" />
    <path d="M10 5.9v10.6" />
  </>
);
export const SearchIcon = createIcon(
  <>
    <circle cx="8.8" cy="8.8" r="5" />
    <path d="m12.6 12.6 4.2 4.2" />
  </>
);
export const AnalyticsIcon = createIcon(
  <path d="M3.5 16.5h13M5.5 16.5v-5M9 16.5V6M12.5 16.5v-7.5M16 16.5V3.5" />
);
export const HabitsIcon = createIcon(
  <>
    <rect x="3.2" y="4.4" width="13.6" height="12.4" rx="2" />
    <path d="M3.2 8h13.6M7 2.8v3M13 2.8v3" />
    <path d="m7.3 12.2 1.9 1.9 3.6-3.7" />
  </>
);
export const LeisureIcon = createIcon(
  <path d="M10 2.6l1.5 3 3.3-.9-.7 3.3 3 1.5-3 1.5.7 3.3-3.3-.9-1.5 3-1.5-3-3.3.9.7-3.3-3-1.5 3-1.5-.7-3.3 3.3.9z" />
);
export const GamesIcon = createIcon(
  <>
    <path d="M6.2 6.5h7.6a3.6 3.6 0 0 1 3.5 4.4l-.7 3.2a1.8 1.8 0 0 1-3 .9L12 13.4H8l-1.6 1.6a1.8 1.8 0 0 1-3-.9l-.7-3.2a3.6 3.6 0 0 1 3.5-4.4z" />
    <path d="M7 9v2.4M5.8 10.2h2.4" />
  </>
);
export const FinanceIcon = createIcon(
  <>
    <ellipse cx="10" cy="5.8" rx="5.6" ry="2.3" />
    <path d="M4.4 5.8v4.1c0 1.3 2.5 2.3 5.6 2.3s5.6-1 5.6-2.3V5.8M4.4 9.9V14c0 1.3 2.5 2.3 5.6 2.3s5.6-1 5.6-2.3V9.9" />
  </>
);
export const MailIcon = createIcon(<path d="M3 5.5h14v10H3zM3.5 6l6.5 5 6.5-5" />);
export const TrophyIcon = createIcon(<path d="M10 2.5 16.5 6.25v7.5L10 17.5l-6.5-3.75v-7.5z" />);
export const SignOutIcon = createIcon(
  <>
    <path d="M8 4H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
    <path d="M12 6.5 15.5 10 12 13.5M15.5 10H8" />
  </>
);
export const CheckIcon = createIcon(<path d="m5 10.5 3.2 3 6.8-7" />);
export const PlusIcon = createIcon(<path d="M10 4.5v11M4.5 10h11" />);
export const CloseIcon = createIcon(<path d="m5 5 10 10M15 5 5 15" />);
export const ChevronLeftIcon = createIcon(<path d="M12 4.5 6.5 10l5.5 5.5" />);
export const ChevronRightIcon = createIcon(<path d="M8 4.5 13.5 10 8 15.5" />);
export const PauseIcon = createIcon(<path d="M7.5 5v10M12.5 5v10" />);
export const LockIcon = createIcon(
  <>
    <rect x="4.5" y="9" width="11" height="8" rx="1.6" />
    <path d="M7 9V6.8a3 3 0 0 1 6 0V9" />
  </>
);
export const UploadIcon = createIcon(
  <path d="M10 13V4M6.6 7.4 10 4l3.4 3.4M4 13.5v2a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-2" />
);
