export function PlayIcon({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        display: "block",
        flexShrink: 0,
      }}
    >
      <path
        d="M8 5.5L18.5 12L8 18.5V5.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function PauseIcon({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        display: "block",
        flexShrink: 0,
      }}
    >
      <rect
        x="6.5"
        y="5"
        width="4"
        height="14"
        rx="0.5"
        fill="currentColor"
      />
      <rect
        x="13.5"
        y="5"
        width="4"
        height="14"
        rx="0.5"
        fill="currentColor"
      />
    </svg>
  );
}

export function ArrowDownIcon({ size = 24 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        display: "block",
        flexShrink: 0,
      }}
    >
      <path
        d="M5 8L12 15L19 8"
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PreviousIcon({ size = 22 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        display: "block",
        flexShrink: 0,
      }}
    >
      <path
        d="M6 5V19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M18 6L9 12L18 18V6Z" fill="currentColor" />
    </svg>
  );
}

export function NextIcon({ size = 22 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        display: "block",
        flexShrink: 0,
      }}
    >
      <path
        d="M18 5V19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M6 6L15 12L6 18V6Z" fill="currentColor" />
    </svg>
  );
}