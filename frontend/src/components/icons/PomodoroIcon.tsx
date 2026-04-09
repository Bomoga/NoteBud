import { forwardRef, type SVGProps } from 'react';

/**
 * Stylized tomato outline for Pomodoro — matches @heroicons/react/24/outline (stroke 1.5, round caps).
 */
const PomodoroIcon = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(
  function PomodoroIcon({ className, ...props }, ref) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className={className}
        ref={ref}
        aria-hidden
        {...props}
      >
        {/* Stem */}
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 4.25V2.75M10.25 3.5c.35-.65.9-1 1.75-1s1.4.35 1.75 1"
        />
        {/* Body */}
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 5.25c-4.6 0-7.75 3.35-7.75 7.35 0 4.25 3.5 7.65 7.75 7.65s7.75-3.4 7.75-7.65c0-4-3.15-7.35-7.75-7.35Z"
        />
      </svg>
    );
  }
);

export default PomodoroIcon;
