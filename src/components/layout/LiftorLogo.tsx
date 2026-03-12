const LiftorLogo = ({ className = "h-7" }: { className?: string }) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <text
      x="4"
      y="26"
      fontFamily="Inter, system-ui, sans-serif"
      fontWeight="800"
      fontSize="28"
      fill="hsl(195, 100%, 50%)"
    >
      L
    </text>
  </svg>
);

export default LiftorLogo;
