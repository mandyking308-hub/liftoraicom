const LiftorLogo = ({ className = "h-7" }: { className?: string }) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Vertical line */}
    <line x1="8" y1="6" x2="8" y2="24" stroke="#2EA3FF" strokeWidth="2" />
    {/* Horizontal line */}
    <line x1="8" y1="24" x2="24" y2="24" stroke="#2EA3FF" strokeWidth="2" />
    {/* Top node */}
    <circle cx="8" cy="6" r="3" fill="#2EA3FF" />
    {/* Corner node */}
    <circle cx="8" cy="24" r="3" fill="#2EA3FF" />
    {/* End node */}
    <circle cx="24" cy="24" r="3" fill="#2EA3FF" />
    {/* Mid-branch node */}
    <line x1="8" y1="14" x2="18" y2="14" stroke="#2EA3FF" strokeWidth="1.5" />
    <circle cx="18" cy="14" r="2.5" fill="#2EA3FF" />
  </svg>
);

export default LiftorLogo;
