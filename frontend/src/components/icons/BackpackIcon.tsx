import { forwardRef, type SVGProps } from 'react';

const BackpackIcon = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(
    function BackpackIcon({ className, ...props }, ref) {
        return (
            <svg
                ref={ref}
                className={className}
                width="30"
                height="30"
                viewBox="0 0 200 200"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
                xmlns="http://www.w3.org/2000/svg"
                {...props}
            >
                {/* Main backpack body */}
                <rect x="50" y="60" width="100" height="100" rx="15" />
                <path d="M50 100 Q50 40 100 40 Q150 40 150 100" />
                {/* Handle */}
                <ellipse cx="100" cy="40" rx="15" ry="13" />
                {/* Front pocket */}
                <rect x="75" y="110" width="50" height="40" rx="8" />
            </svg>
        );
    }
);

export default BackpackIcon;
