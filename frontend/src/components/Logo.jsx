export default function Logo({ className = "", ...props }) {
  return (
    <img
      src="/logo.png"
      alt="WeCare logo"
      className={`object-contain ${className}`}
      {...props}
    />
  );
}
